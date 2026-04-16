import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import {
  BaseScraper,
  type FetchOptions,
  type RawContentItem,
  type SourceInfo,
} from './base-scraper';
import type { Platform, ContentType } from '@/lib/db/models/content';

// Free X/Twitter scraping using Nitter + Anubis PoW solver
// No API key or browser required — works on Vercel serverless

const NITTER_INSTANCES = [
  'https://nitter.tiekoetter.com',
];

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface AnubisChallenge {
  id: string;
  method: string;
  randomData: string;
  difficulty: number;
}

export class XScraper extends BaseScraper {
  platform: Platform = 'x';
  name = 'X/Twitter Scraper (Nitter)';

  private currentInstance = 0;
  // Cache session cookies per instance
  private sessionCookies: Map<string, string> = new Map();

  private getNitterInstance(): string {
    const instance = NITTER_INSTANCES[this.currentInstance];
    this.currentInstance = (this.currentInstance + 1) % NITTER_INSTANCES.length;
    return instance;
  }

  /**
   * Solve Anubis proof-of-work challenge.
   * Finds a nonce where SHA-256(randomData + nonce) has `difficulty` leading zero nibbles.
   */
  private solveAnubisPoW(randomData: string, difficulty: number): { hash: string; nonce: number } {
    const halfBytes = Math.floor(difficulty / 2);
    const oddDifficulty = difficulty % 2 !== 0;

    for (let nonce = 0; nonce < 10_000_000; nonce++) {
      const input = randomData + nonce;
      const hashBuf = createHash('sha256').update(input).digest();

      let valid = true;
      for (let i = 0; i < halfBytes; i++) {
        if (hashBuf[i] !== 0) { valid = false; break; }
      }
      if (valid && oddDifficulty && (hashBuf[halfBytes] >> 4) !== 0) {
        valid = false;
      }

      if (valid) {
        return { hash: hashBuf.toString('hex'), nonce };
      }
    }

    throw new Error(`Failed to solve Anubis PoW after 10M attempts (difficulty=${difficulty})`);
  }

  /**
   * Extract valid (non-expired) cookies from a fetch response.
   */
  private extractCookies(res: Response): string {
    const cookies: string[] = [];
    const setCookies = res.headers.getSetCookie?.() || [];
    for (const sc of setCookies) {
      const pair = sc.split(';')[0];
      // Skip deleted cookies (Max-Age=0 or empty value)
      if (pair && !sc.includes('Max-Age=0') && !pair.endsWith('=')) {
        cookies.push(pair);
      }
    }
    return cookies.join('; ');
  }

  /**
   * Fetch a Nitter page, solving Anubis PoW if needed.
   * Returns the HTML body.
   */
  private async fetchNitterPage(url: string, instance: string): Promise<string> {
    const cachedCookie = this.sessionCookies.get(instance);
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
    if (cachedCookie) {
      headers['Cookie'] = cachedCookie;
    }

    const res = await fetch(url, { headers, redirect: 'follow' });
    const html = await res.text();

    // Check if we got the real page (not Anubis challenge)
    if (!html.includes('anubis_challenge')) {
      return html;
    }

    // Parse Anubis challenge
    console.log('[X] Anubis PoW challenge detected, solving...');
    const $ = cheerio.load(html);
    const challengeJson = $('#anubis_challenge').text().trim();
    if (!challengeJson) throw new Error('Anubis challenge JSON not found');

    // Extract verification cookie from the challenge response
    const challengeCookies = this.extractCookies(res);

    const { challenge } = JSON.parse(challengeJson) as { challenge: AnubisChallenge };
    const start = Date.now();
    const { hash, nonce } = this.solveAnubisPoW(challenge.randomData, challenge.difficulty);
    const elapsed = Date.now() - start;
    console.log(`[X] Anubis PoW solved in ${elapsed}ms (nonce=${nonce})`);

    // Submit solution with the verification cookie
    const passUrl = new URL(`${instance}/.within.website/x/cmd/anubis/api/pass-challenge`);
    passUrl.searchParams.set('id', challenge.id);
    passUrl.searchParams.set('response', hash);
    passUrl.searchParams.set('nonce', String(nonce));
    passUrl.searchParams.set('redir', url);
    passUrl.searchParams.set('elapsedTime', String(elapsed));

    const passRes = await fetch(passUrl.toString(), {
      headers: { 'User-Agent': USER_AGENT, 'Cookie': challengeCookies },
      redirect: 'manual',
    });

    // Combine verification cookie + auth JWT cookie
    const authCookies = this.extractCookies(passRes);
    const allCookies = [challengeCookies, authCookies].filter(Boolean).join('; ');
    this.sessionCookies.set(instance, allCookies);

    // Now fetch the actual page with the full cookie set
    const finalRes = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Cookie': allCookies },
      redirect: 'follow',
    });
    return finalRes.text();
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const instance = this.getNitterInstance();
      const html = await this.fetchNitterPage(instance, instance);
      return html.length > 0 && !html.includes('anubis_challenge');
    } catch (error) {
      console.error('[X] Nitter validation failed:', error);
      return false;
    }
  }

  async getSourceInfo(username: string): Promise<SourceInfo | null> {
    try {
      const instance = this.getNitterInstance();
      const html = await this.fetchNitterPage(`${instance}/${username}`, instance);
      const $ = cheerio.load(html);

      const name = $('.profile-card-fullname').text().trim() || username;
      const avatar = $('.profile-card-avatar img').attr('src') || '';
      const followersText = $('.profile-statlist .followers .profile-stat-num').text().trim();
      const followers = this.parseCount(followersText);

      return {
        id: username,
        name,
        url: `https://x.com/${username}`,
        subscriberCount: followers,
        avatarUrl: avatar.startsWith('http') ? avatar : `${instance}${avatar}`,
      };
    } catch (error) {
      console.error('[X] Failed to get user info:', error);
      return null;
    }
  }

  async fetchContent(
    username: string,
    options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    const { maxItems = 30 } = options;
    const items: RawContentItem[] = [];

    try {
      const instance = this.getNitterInstance();
      const html = await this.fetchNitterPage(`${instance}/${username}`, instance);
      const $ = cheerio.load(html);

      // Get user info
      const authorName = $('.profile-card-fullname').text().trim() || username;
      const authorAvatar = $('.profile-card-avatar img').attr('src') || '';

      // Parse tweets
      $('.timeline-item')
        .slice(0, maxItems)
        .each((_, element) => {
          const $el = $(element);

          // Skip retweets
          if ($el.find('.retweet-header').length > 0) return;

          const tweetLink = $el.find('.tweet-link').attr('href') || '';
          const tweetId = tweetLink.split('/status/')[1]?.split('#')[0] || '';

          if (!tweetId) return;

          const text = $el.find('.tweet-content').text().trim();
          const dateStr = $el.find('.tweet-date a').attr('title') || '';
          const publishedAt = this.parseNitterDate(dateStr);

          // Get stats
          const stats = $el.find('.tweet-stat');
          let comments = 0, retweets = 0, likes = 0;

          stats.each((_, stat) => {
            const $stat = $(stat);
            const icon = $stat.find('.icon-container > span').attr('class') || '';
            const count = this.parseCount($stat.text().trim());

            if (icon.includes('comment')) comments = count;
            else if (icon.includes('retweet')) retweets = count;
            else if (icon.includes('heart')) likes = count;
          });

          // Check for media
          const hasImage = $el.find('.still-image').length > 0;
          const hasVideo = $el.find('.gif-video, .gallery-video').length > 0;
          let type: ContentType = 'text';
          let thumbnailUrl = '';

          if (hasVideo) {
            type = 'video';
            thumbnailUrl = $el.find('.gif-video video, .gallery-video video').attr('poster') || '';
          } else if (hasImage) {
            type = 'image';
            thumbnailUrl = $el.find('.still-image img').attr('src') || '';
          }

          // Fix thumbnail URL
          if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
            thumbnailUrl = `${instance}${thumbnailUrl}`;
          }

          items.push({
            platformId: tweetId,
            platform: 'x',
            type,
            title: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
            description: text,
            thumbnailUrl,
            contentUrl: `https://x.com/${username}/status/${tweetId}`,
            mediaUrls: [],
            author: {
              id: username,
              name: authorName,
              handle: username,
              avatarUrl: authorAvatar.startsWith('http') ? authorAvatar : `${instance}${authorAvatar}`,
              profileUrl: `https://x.com/${username}`,
            },
            platformMetrics: {
              likes,
              shares: retweets,
              comments,
              lastUpdated: new Date(),
            },
            publishedAt,
            tags: this.extractTags(text),
            language: this.detectLanguage(text),
          });
        });
    } catch (error) {
      console.error('[X] Error fetching content:', error);
    }

    return items;
  }

  async searchContent(
    query: string,
    options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    const { maxItems = 30 } = options;
    const items: RawContentItem[] = [];

    try {
      const instance = this.getNitterInstance();
      const html = await this.fetchNitterPage(
        `${instance}/search?f=tweets&q=${encodeURIComponent(query)}`,
        instance
      );
      const $ = cheerio.load(html);

      $('.timeline-item')
        .slice(0, maxItems)
        .each((_, element) => {
          const $el = $(element);

          const tweetLink = $el.find('.tweet-link').attr('href') || '';
          const tweetId = tweetLink.split('/status/')[1]?.split('#')[0] || '';
          const username = tweetLink.split('/')[1] || '';

          if (!tweetId || !username) return;

          const text = $el.find('.tweet-content').text().trim();
          const authorName = $el.find('.fullname').text().trim() || username;
          const authorAvatar = $el.find('.avatar img').attr('src') || '';
          const dateStr = $el.find('.tweet-date a').attr('title') || '';
          const publishedAt = this.parseNitterDate(dateStr);

          const hasImage = $el.find('.still-image').length > 0;
          const hasVideo = $el.find('.gif-video, .gallery-video').length > 0;
          let type: ContentType = 'text';
          let thumbnailUrl = '';

          if (hasVideo) {
            type = 'video';
            thumbnailUrl = $el.find('.gif-video video, .gallery-video video').attr('poster') || '';
          } else if (hasImage) {
            type = 'image';
            thumbnailUrl = $el.find('.still-image img').attr('src') || '';
          }

          if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
            thumbnailUrl = `${instance}${thumbnailUrl}`;
          }

          // Get stats
          const stats = $el.find('.tweet-stat');
          let comments = 0, retweets = 0, likes = 0;

          stats.each((_, stat) => {
            const $stat = $(stat);
            const icon = $stat.find('.icon-container > span').attr('class') || '';
            const count = this.parseCount($stat.text().trim());

            if (icon.includes('comment')) comments = count;
            else if (icon.includes('retweet')) retweets = count;
            else if (icon.includes('heart')) likes = count;
          });

          items.push({
            platformId: tweetId,
            platform: 'x',
            type,
            title: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
            description: text,
            thumbnailUrl,
            contentUrl: `https://x.com/${username}/status/${tweetId}`,
            mediaUrls: [],
            author: {
              id: username,
              name: authorName,
              handle: username,
              avatarUrl: authorAvatar.startsWith('http') ? authorAvatar : `${instance}${authorAvatar}`,
              profileUrl: `https://x.com/${username}`,
            },
            platformMetrics: {
              likes,
              shares: retweets,
              comments,
              lastUpdated: new Date(),
            },
            publishedAt,
            tags: this.extractTags(text),
            language: this.detectLanguage(text),
          });
        });
    } catch (error) {
      console.error('[X] Error searching content:', error);
    }

    return items;
  }

  private parseCount(text: string): number {
    if (!text) return 0;
    const num = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (text.includes('K')) return num * 1000;
    if (text.includes('M')) return num * 1000000;
    return num || 0;
  }

  // Nitter date title format: "Apr 15, 2026 · 3:16 PM UTC"
  private parseNitterDate(title: string): Date {
    if (!title) return new Date();
    const normalized = title.replace(' · ', ' ').trim();
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  async close(): Promise<void> {
    // No browser to close — just clear cookie cache
    this.sessionCookies.clear();
  }
}

export const xScraper = new XScraper();
