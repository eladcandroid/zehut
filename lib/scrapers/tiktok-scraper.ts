import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import {
  BaseScraper,
  type FetchOptions,
  type RawContentItem,
  type SourceInfo,
} from './base-scraper';
import type { Platform } from '@/lib/db/models/content';

// TikTok doesn't have a public API for reading content
// This scraper uses Puppeteer to scrape public profile pages
// Note: TikTok has aggressive anti-bot measures

export class TikTokScraper extends BaseScraper {
  platform: Platform = 'tiktok';
  name = 'TikTok Scraper';

  private browser: Browser | null = null;

  async validateCredentials(): Promise<boolean> {
    // No API credentials needed, just check if Puppeteer works
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      await page.goto('https://www.tiktok.com', { waitUntil: 'domcontentloaded' });
      await page.close();
      return true;
    } catch (error) {
      console.error('[TikTok] Puppeteer validation failed:', error);
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

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(`https://www.tiktok.com/@${username}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for profile to load
      await page.waitForSelector('[data-e2e="user-title"]', { timeout: 10000 }).catch(() => null);

      const html = await page.content();
      const $ = cheerio.load(html);

      const name = $('[data-e2e="user-title"]').text().trim() || username;
      const followersText = $('[data-e2e="followers-count"]').text().trim();
      const followers = this.parseCount(followersText);
      const avatar = $('[data-e2e="user-avatar"] img').attr('src') || '';

      await page.close();

      return {
        id: username,
        name,
        url: `https://www.tiktok.com/@${username}`,
        subscriberCount: followers,
        avatarUrl: avatar,
      };
    } catch (error) {
      console.error('[TikTok] Failed to get user info:', error);
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

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(`https://www.tiktok.com/@${username}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for videos to load
      await page
        .waitForSelector('[data-e2e="user-post-item"]', { timeout: 10000 })
        .catch(() => null);

      // Scroll to load more videos
      await this.scrollPage(page, Math.ceil(maxItems / 10));

      const html = await page.content();
      const $ = cheerio.load(html);

      // Get user info
      const authorName = $('[data-e2e="user-title"]').text().trim() || username;
      const authorAvatar = $('[data-e2e="user-avatar"] img').attr('src') || '';

      // Parse videos
      $('[data-e2e="user-post-item"]')
        .slice(0, maxItems)
        .each((_, element) => {
          const $el = $(element);
          const link = $el.find('a').attr('href') || '';
          const videoId = link.split('/video/')[1]?.split('?')[0] || '';

          if (!videoId) return;

          const thumbnail = $el.find('img').attr('src') || '';
          const description = $el.find('[data-e2e="video-desc"]').text().trim();
          const viewsText = $el.find('[data-e2e="video-views"]').text().trim();
          const views = this.parseCount(viewsText);

          items.push({
            platformId: videoId,
            platform: 'tiktok',
            type: 'video',
            title: description.slice(0, 100) || 'TikTok Video',
            description,
            thumbnailUrl: thumbnail,
            contentUrl: `https://www.tiktok.com/@${username}/video/${videoId}`,
            mediaUrls: [],
            author: {
              id: username,
              name: authorName,
              handle: username,
              avatarUrl: authorAvatar,
              profileUrl: `https://www.tiktok.com/@${username}`,
            },
            platformMetrics: {
              views,
              lastUpdated: new Date(),
            },
            publishedAt: new Date(), // TikTok doesn't show dates on profile page
            tags: this.extractTags(description),
            language: this.detectLanguage(description),
          });
        });

      await page.close();
    } catch (error) {
      console.error('[TikTok] Error fetching content:', error);
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

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const searchUrl = `https://www.tiktok.com/search/video?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for results
      await page
        .waitForSelector('[data-e2e="search-card-container"]', { timeout: 10000 })
        .catch(() => null);

      await this.scrollPage(page, Math.ceil(maxItems / 10));

      const html = await page.content();
      const $ = cheerio.load(html);

      $('[data-e2e="search-card-container"]')
        .slice(0, maxItems)
        .each((_, element) => {
          const $el = $(element);
          const link = $el.find('a').attr('href') || '';
          const videoId = link.split('/video/')[1]?.split('?')[0] || '';
          const username = link.split('/@')[1]?.split('/')[0] || '';

          if (!videoId || !username) return;

          const thumbnail = $el.find('img').attr('src') || '';
          const description = $el.find('[data-e2e="video-desc"]').text().trim();
          const authorName = $el.find('[data-e2e="search-card-user-unique-id"]').text().trim() || username;

          items.push({
            platformId: videoId,
            platform: 'tiktok',
            type: 'video',
            title: description.slice(0, 100) || 'TikTok Video',
            description,
            thumbnailUrl: thumbnail,
            contentUrl: `https://www.tiktok.com/@${username}/video/${videoId}`,
            mediaUrls: [],
            author: {
              id: username,
              name: authorName,
              handle: username,
              profileUrl: `https://www.tiktok.com/@${username}`,
            },
            platformMetrics: {
              lastUpdated: new Date(),
            },
            publishedAt: new Date(),
            tags: this.extractTags(description),
            language: this.detectLanguage(description),
          });
        });

      await page.close();
    } catch (error) {
      console.error('[TikTok] Error searching content:', error);
    }

    return items;
  }

  private async scrollPage(page: Page, times: number): Promise<void> {
    for (let i = 0; i < times; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await this.delay(1000);
    }
  }

  private parseCount(text: string): number {
    if (!text) return 0;
    const num = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (text.includes('K')) return num * 1000;
    if (text.includes('M')) return num * 1000000;
    if (text.includes('B')) return num * 1000000000;
    return num || 0;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const tiktokScraper = new TikTokScraper();
