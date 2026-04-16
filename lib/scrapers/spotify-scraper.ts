import * as cheerio from 'cheerio';
import {
  BaseScraper,
  type FetchOptions,
  type RawContentItem,
  type SourceInfo,
} from './base-scraper';
import type { Platform } from '@/lib/db/models/content';

// Spotify podcast scraping via RSS feed (hosted on Anchor/Spotify for Podcasters)
// No API key or browser required — works on Vercel serverless
// RSS URL discovered via Apple Podcasts search API

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Map show IDs to their RSS feed URLs (discovered via iTunes Search API)
const RSS_FEEDS: Record<string, string> = {
  '0hVvJcOmIyguaOEKUDzsNP': 'https://anchor.fm/s/6639fb3c/podcast/rss',
};

export class SpotifyScraper extends BaseScraper {
  platform: Platform = 'spotify';
  name = 'Spotify Podcast Scraper';

  /**
   * Discover the RSS feed URL for a Spotify show via iTunes Search API.
   */
  private async discoverRssFeed(showId: string): Promise<string | null> {
    // Check cache first
    if (RSS_FEEDS[showId]) return RSS_FEEDS[showId];

    // Get show name from oEmbed, then search iTunes for RSS
    try {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=https://open.spotify.com/show/${showId}`,
        { headers: { 'User-Agent': USER_AGENT } }
      );
      if (!oembedRes.ok) return null;
      const oembed = await oembedRes.json();
      const showName = oembed.title;
      if (!showName) return null;

      const searchRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(showName)}&entity=podcast&limit=5`,
        { headers: { 'User-Agent': USER_AGENT } }
      );
      if (!searchRes.ok) return null;
      const search = await searchRes.json();

      for (const result of search.results || []) {
        if (result.feedUrl && result.collectionName?.includes(showName.split(' ')[0])) {
          RSS_FEEDS[showId] = result.feedUrl;
          return result.feedUrl;
        }
      }
    } catch (error) {
      console.error('[Spotify] RSS discovery failed:', error);
    }
    return null;
  }

  private async fetchRssFeed(feedUrl: string): Promise<string> {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`RSS feed returned ${res.status}`);
    return res.text();
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await fetch(
        'https://open.spotify.com/oembed?url=https://open.spotify.com/show/0hVvJcOmIyguaOEKUDzsNP',
        { headers: { 'User-Agent': USER_AGENT } }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async getSourceInfo(showId: string): Promise<SourceInfo | null> {
    try {
      const feedUrl = await this.discoverRssFeed(showId);
      if (!feedUrl) return null;

      const xml = await this.fetchRssFeed(feedUrl);
      const $ = cheerio.load(xml, { xmlMode: true });

      const name = $('channel > title').text().trim() || showId;
      const image = $('channel > itunes\\:image').attr('href')
        || $('channel > image > url').text().trim()
        || '';

      return {
        id: showId,
        name,
        url: `https://open.spotify.com/show/${showId}`,
        avatarUrl: image,
      };
    } catch (error) {
      console.error('[Spotify] Failed to get show info:', error);
      return null;
    }
  }

  async fetchContent(
    showId: string,
    options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    const { maxItems = 50 } = options;
    const items: RawContentItem[] = [];

    try {
      const feedUrl = await this.discoverRssFeed(showId);
      if (!feedUrl) {
        console.error(`[Spotify] No RSS feed found for show ${showId}`);
        return items;
      }

      const xml = await this.fetchRssFeed(feedUrl);
      const $ = cheerio.load(xml, { xmlMode: true });

      // Channel info
      const showName = $('channel > title').text().trim() || showId;
      const showImage = $('channel > itunes\\:image').attr('href')
        || $('channel > image > url').text().trim()
        || '';

      // Parse episodes
      $('item').each((i, el) => {
        if (items.length >= maxItems) return;

        const $item = $(el);
        const title = $item.find('title').text().trim();
        const pubDate = $item.find('pubDate').text().trim();
        const link = $item.find('link').text().trim();
        const duration = $item.find('itunes\\:duration').text().trim();
        const episodeImage = $item.find('itunes\\:image').attr('href') || showImage;
        const enclosure = $item.find('enclosure').attr('url') || '';
        const description = $item.find('description').text().trim()
          || $item.find('itunes\\:summary').text().trim()
          || title;

        // Extract a stable ID from the link or guid
        const guid = $item.find('guid').text().trim();
        const episodeId = guid.match(/episodes\/([^/]+)/)?.[1]
          || guid.match(/([a-zA-Z0-9]+)$/)?.[1]
          || `ep_${i}`;

        // Map podcast link to Spotify URL when possible
        const spotifyUrl = link.includes('spotify.com')
          ? link
          : `https://open.spotify.com/show/${showId}`;

        items.push({
          platformId: episodeId,
          platform: 'spotify',
          type: 'video', // podcast episodes use video UI (play button + download)
          title: title.slice(0, 100) + (title.length > 100 ? '...' : ''),
          description: description.slice(0, 500),
          thumbnailUrl: episodeImage,
          contentUrl: spotifyUrl,
          mediaUrls: enclosure ? [enclosure] : [],
          author: {
            id: showId,
            name: showName,
            handle: showId,
            avatarUrl: showImage,
            profileUrl: `https://open.spotify.com/show/${showId}`,
          },
          platformMetrics: {
            lastUpdated: new Date(),
          },
          publishedAt: pubDate ? new Date(pubDate) : new Date(),
          tags: this.extractTags(title),
          language: this.detectLanguage(title),
        });
      });

      console.log(`[Spotify] Parsed ${items.length} episodes from RSS feed`);
    } catch (error) {
      console.error('[Spotify] Error fetching content:', error);
    }

    return items;
  }

  async searchContent(
    _query: string,
    _options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    console.warn('[Spotify] Search not supported via RSS');
    return [];
  }

  async close(): Promise<void> {
    // No resources to clean up
  }
}

export const spotifyScraper = new SpotifyScraper();
