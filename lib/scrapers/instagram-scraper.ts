import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import {
  BaseScraper,
  type FetchOptions,
  type RawContentItem,
  type SourceInfo,
} from './base-scraper';
import type { Platform, ContentType } from '@/lib/db/models/content';

// Instagram Graph API requires:
// 1. Facebook App
// 2. Instagram Business/Creator account linked to Facebook Page
// 3. User access token with instagram_basic permission
//
// This scraper uses Puppeteer for public profile scraping as a fallback
// Note: Instagram has aggressive anti-bot measures

export class InstagramScraper extends BaseScraper {
  platform: Platform = 'instagram';
  name = 'Instagram Scraper';

  private browser: Browser | null = null;

  async validateCredentials(): Promise<boolean> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded' });
      await page.close();
      return true;
    } catch (error) {
      console.error('[Instagram] Puppeteer validation failed:', error);
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
      // Try oEmbed first (no authentication needed)
      const response = await fetch(
        `https://api.instagram.com/oembed/?url=https://www.instagram.com/${username}/`
      );

      if (response.ok) {
        const data = await response.json();
        return {
          id: username,
          name: data.author_name || username,
          url: `https://www.instagram.com/${username}/`,
        };
      }

      // Fallback to Puppeteer
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for profile to load
      await page.waitForSelector('header', { timeout: 10000 }).catch(() => null);

      const html = await page.content();
      const $ = cheerio.load(html);

      // Try to extract from meta tags
      const title = $('meta[property="og:title"]').attr('content') || '';
      const name = title.split('(')[0]?.trim() || username;

      await page.close();

      return {
        id: username,
        name,
        url: `https://www.instagram.com/${username}/`,
      };
    } catch (error) {
      console.error('[Instagram] Failed to get user info:', error);
      return null;
    }
  }

  async fetchContent(
    username: string,
    options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    const { maxItems = 12 } = options;
    const items: RawContentItem[] = [];

    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Check for login wall
      const loginWall = await page.$('input[name="username"]');
      if (loginWall) {
        console.warn('[Instagram] Login wall detected. Limited scraping available.');
        await page.close();
        return items;
      }

      // Wait for posts to load
      await page.waitForSelector('article a', { timeout: 10000 }).catch(() => null);

      const html = await page.content();
      const $ = cheerio.load(html);

      // Get user info from meta tags
      const title = $('meta[property="og:title"]').attr('content') || '';
      const authorName = title.split('(')[0]?.trim() || username;
      const description = $('meta[property="og:description"]').attr('content') || '';

      // Extract posts
      const postLinks: string[] = [];
      $('article a[href*="/p/"], article a[href*="/reel/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && postLinks.length < maxItems) {
          postLinks.push(href);
        }
      });

      // Deduplicate
      const uniqueLinks = [...new Set(postLinks)];

      for (const link of uniqueLinks.slice(0, maxItems)) {
        const shortcode = link.match(/\/(?:p|reel)\/([^/]+)/)?.[1];
        if (!shortcode) continue;

        const isReel = link.includes('/reel/');

        items.push({
          platformId: shortcode,
          platform: 'instagram',
          type: isReel ? 'reel' : 'image',
          title: `${authorName} on Instagram`,
          description: '',
          thumbnailUrl: '',
          contentUrl: `https://www.instagram.com${link}`,
          mediaUrls: [],
          author: {
            id: username,
            name: authorName,
            handle: username,
            profileUrl: `https://www.instagram.com/${username}/`,
          },
          platformMetrics: {
            lastUpdated: new Date(),
          },
          publishedAt: new Date(),
          tags: [],
          language: 'he',
        });
      }

      await page.close();
    } catch (error) {
      console.error('[Instagram] Error fetching content:', error);
    }

    return items;
  }

  async searchContent(
    query: string,
    options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    const { maxItems = 12 } = options;
    const items: RawContentItem[] = [];

    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Instagram requires login for hashtag search
      // Try without login first
      const hashtag = query.replace('#', '');
      await page.goto(`https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Check for login wall
      const loginWall = await page.$('input[name="username"]');
      if (loginWall) {
        console.warn('[Instagram] Login required for hashtag search');
        await page.close();
        return items;
      }

      await page.waitForSelector('article a', { timeout: 10000 }).catch(() => null);

      const html = await page.content();
      const $ = cheerio.load(html);

      const postLinks: string[] = [];
      $('article a[href*="/p/"], article a[href*="/reel/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && postLinks.length < maxItems) {
          postLinks.push(href);
        }
      });

      const uniqueLinks = [...new Set(postLinks)];

      for (const link of uniqueLinks.slice(0, maxItems)) {
        const shortcode = link.match(/\/(?:p|reel)\/([^/]+)/)?.[1];
        if (!shortcode) continue;

        const isReel = link.includes('/reel/');

        items.push({
          platformId: shortcode,
          platform: 'instagram',
          type: isReel ? 'reel' : 'image',
          title: `#${hashtag} on Instagram`,
          description: '',
          thumbnailUrl: '',
          contentUrl: `https://www.instagram.com${link}`,
          mediaUrls: [],
          author: {
            id: 'unknown',
            name: 'Instagram User',
            handle: 'unknown',
            profileUrl: '',
          },
          platformMetrics: {
            lastUpdated: new Date(),
          },
          publishedAt: new Date(),
          tags: [hashtag],
          language: 'he',
        });
      }

      await page.close();
    } catch (error) {
      console.error('[Instagram] Error searching content:', error);
    }

    return items;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const instagramScraper = new InstagramScraper();
