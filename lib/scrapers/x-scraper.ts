import puppeteer, { Browser } from 'puppeteer';
import * as cheerio from 'cheerio';
import {
  BaseScraper,
  type FetchOptions,
  type RawContentItem,
  type SourceInfo,
} from './base-scraper';
import type { Platform, ContentType } from '@/lib/db/models/content';

// Free X/Twitter scraping using Nitter instances (open-source Twitter frontend)
// No API key required

const NITTER_INSTANCES = [
  'https://nitter.poast.org',
  'https://nitter.privacydev.net',
  'https://nitter.woodland.cafe',
];

export class XScraper extends BaseScraper {
  platform: Platform = 'x';
  name = 'X/Twitter Scraper (Nitter)';

  private browser: Browser | null = null;
  private currentInstance = 0;

  private getNitterInstance(): string {
    const instance = NITTER_INSTANCES[this.currentInstance];
    this.currentInstance = (this.currentInstance + 1) % NITTER_INSTANCES.length;
    return instance;
  }

  async validateCredentials(): Promise<boolean> {
    // No credentials needed for Nitter scraping
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      await page.goto(this.getNitterInstance(), { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.close();
      return true;
    } catch (error) {
      console.error('[X] Nitter validation failed:', error);
      return false;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  async getSourceInfo(username: string): Promise<SourceInfo | null> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      const instance = this.getNitterInstance();

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(`${instance}/${username}`, {
        waitUntil: 'networkidle2',
        timeout: 15000,
      });

      const html = await page.content();
      const $ = cheerio.load(html);

      const name = $('.profile-card-fullname').text().trim() || username;
      const avatar = $('.profile-card-avatar img').attr('src') || '';
      const followersText = $('.profile-stat-num').first().text().trim();
      const followers = this.parseCount(followersText);

      await page.close();

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
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      const instance = this.getNitterInstance();

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(`${instance}/${username}`, {
        waitUntil: 'networkidle2',
        timeout: 15000,
      });

      // Wait for tweets to load
      await page.waitForSelector('.timeline-item', { timeout: 10000 }).catch(() => null);

      const html = await page.content();
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

          // Get stats
          const stats = $el.find('.tweet-stat');
          let comments = 0, retweets = 0, likes = 0;

          stats.each((_, stat) => {
            const $stat = $(stat);
            const icon = $stat.find('.icon-container').attr('class') || '';
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
            thumbnailUrl = $el.find('.gif-video, .gallery-video').attr('poster') || '';
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
            publishedAt: dateStr ? new Date(dateStr) : new Date(),
            tags: this.extractTags(text),
            language: this.detectLanguage(text),
          });
        });

      await page.close();
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
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      const instance = this.getNitterInstance();

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(`${instance}/search?f=tweets&q=${encodeURIComponent(query)}`, {
        waitUntil: 'networkidle2',
        timeout: 15000,
      });

      await page.waitForSelector('.timeline-item', { timeout: 10000 }).catch(() => null);

      const html = await page.content();
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

          const hasImage = $el.find('.still-image').length > 0;
          const hasVideo = $el.find('.gif-video, .gallery-video').length > 0;
          let type: ContentType = 'text';
          let thumbnailUrl = '';

          if (hasVideo) {
            type = 'video';
            thumbnailUrl = $el.find('.gif-video, .gallery-video').attr('poster') || '';
          } else if (hasImage) {
            type = 'image';
            thumbnailUrl = $el.find('.still-image img').attr('src') || '';
          }

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
              lastUpdated: new Date(),
            },
            publishedAt: dateStr ? new Date(dateStr) : new Date(),
            tags: this.extractTags(text),
            language: this.detectLanguage(text),
          });
        });

      await page.close();
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

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const xScraper = new XScraper();
