import { BaseScraper, type FetchOptions, type RawContentItem, type SourceInfo } from './base-scraper';
import type { Platform, ContentType } from '@/lib/db/models/content';
import { chromium, type Browser, type Page, type Cookie } from 'playwright';

interface FacebookPost {
  postId: string;
  postUrl: string;
  text: string;
  authorName: string;
  authorId: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  imageUrl: string | null;
  videoUrl: string | null;
}

// Facebook cookies from environment or file
const FB_COOKIES: Cookie[] = [
  {
    name: 'c_user',
    value: process.env.FB_C_USER || '100001799181170',
    domain: '.facebook.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None' as const,
    expires: Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year
  },
  {
    name: 'xs',
    value: process.env.FB_XS || '21%3AHzzB2-eGrdvfsw%3A2%3A1767257679%3A-1%3A-1%3A%3AAcy3kMQBd8FQdIXUkkO-mD5LcRfoy0fwPnuI7IjQpL0',
    domain: '.facebook.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'None' as const,
    expires: Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year
  },
];

export class FacebookScraper extends BaseScraper {
  platform: Platform = 'facebook';
  name = 'Facebook Scraper (Playwright)';

  private browser: Browser | null = null;

  async validateCredentials(): Promise<boolean> {
    // Check if cookies are configured
    return FB_COOKIES.every(c => c.value && c.value.length > 0);
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async fetchContent(pageId: string, options: FetchOptions = {}): Promise<RawContentItem[]> {
    const { maxItems = 50 } = options;

    console.log(`[Facebook] Fetching posts from ${pageId} using Playwright...`);

    let page: Page | null = null;

    try {
      const browser = await this.getBrowser();
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        locale: 'en-US',
      });

      // Set Facebook cookies
      await context.addCookies(FB_COOKIES);

      page = await context.newPage();

      // Navigate to the Facebook page
      const pageUrl = `https://www.facebook.com/${pageId}`;
      console.log(`[Facebook] Navigating to ${pageUrl}`);

      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Wait for posts to load
      await page.waitForTimeout(5000);

      // Check current URL and page title
      const currentUrl = page.url();
      const pageTitle = await page.title();
      console.log(`[Facebook] Current URL: ${currentUrl}`);
      console.log(`[Facebook] Page title: ${pageTitle}`);

      // Check if we're on a login page
      if (currentUrl.includes('login') || pageTitle.includes('Log in') || pageTitle.includes('Log Into')) {
        throw new Error('Facebook requires login - cookies may have expired');
      }

      // Scroll to load more posts
      const scrollCount = Math.min(Math.ceil(maxItems / 3), 20); // ~3 posts per scroll, max 20 scrolls
      for (let i = 0; i < scrollCount; i++) {
        await page.evaluate(() => window.scrollBy(0, 1500));
        await page.waitForTimeout(1500);
      }

      // Extract posts
      const posts = await this.extractPosts(page, pageId, maxItems);

      console.log(`[Facebook] Extracted ${posts.length} posts from ${pageId}`);

      await context.close();

      return posts;

    } catch (error) {
      console.error('[Facebook] Error fetching content:', error);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  private async extractPosts(page: Page, pageId: string, maxItems: number): Promise<RawContentItem[]> {
    const posts = await page.evaluate((args) => {
      const { pageId, maxItems } = args;
      const results: any[] = [];
      const seenIds = new Set<string>();

      // Find post containers - Facebook uses various class patterns
      // Try multiple selectors and combine results
      const postSelectors = [
        '[role="article"]',
        '[data-pagelet^="FeedUnit"]',
        'div[class*="x1yztbdb"][class*="x1n2onr6"]',
      ];

      let postElements: Element[] = [];
      for (const selector of postSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > postElements.length) {
          postElements = Array.from(elements);
        }
      }

      console.log(`Found ${postElements.length} potential posts`);

      for (const post of postElements) {
        if (results.length >= maxItems) break;

        try {
          // Extract post text - try multiple selectors
          let text = '';
          const textSelectors = [
            '[data-ad-preview="message"]',
            '[dir="auto"]:not([role="button"])',
            'span[dir="auto"]',
          ];
          for (const sel of textSelectors) {
            const el = post.querySelector(sel);
            if (el && el.textContent && el.textContent.length > 20) {
              text = el.textContent;
              break;
            }
          }

          // Extract post link - look for various URL patterns
          let postUrl = '';
          let postId = '';
          const links = post.querySelectorAll('a[href]');
          for (const link of links) {
            const href = link.getAttribute('href') || '';
            // Match Facebook post URL patterns
            const postMatch = href.match(/\/(posts|photos|videos|watch|reel)\/(\d+)/) ||
                             href.match(/\/permalink\/(\d+)/) ||
                             href.match(/story_fbid=(\d+)/) ||
                             href.match(/\/(\d{10,})(?:\/|$)/);
            if (postMatch) {
              postUrl = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
              postId = postMatch[2] || postMatch[1];
              break;
            }
          }

          // Skip if no ID or already seen
          if (!postId) {
            postId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          if (seenIds.has(postId)) continue;
          seenIds.add(postId);

          // Extract timestamp from any time-related element
          let timestamp = new Date().toISOString();
          const timeLinks = post.querySelectorAll('a[href*="?__cft"]');
          for (const tl of timeLinks) {
            const ariaLabel = tl.getAttribute('aria-label');
            if (ariaLabel && ariaLabel.match(/\d/)) {
              timestamp = ariaLabel;
              break;
            }
          }

          // Extract images
          const images = post.querySelectorAll('img[src*="scontent"]');
          let imageUrl: string | null = null;
          for (const img of images) {
            const src = img.getAttribute('src');
            // Skip small icons and profile pictures
            if (src && !src.includes('_s.') && !src.includes('50x50') && !src.includes('40x40')) {
              imageUrl = src;
              break;
            }
          }

          // Extract video
          const videoElement = post.querySelector('video');
          const videoUrl = videoElement?.getAttribute('src') || null;

          // Only add if we have meaningful content
          if (text.length > 10 || imageUrl || videoUrl) {
            results.push({
              postId,
              postUrl: postUrl || `https://www.facebook.com/${pageId}`,
              text: text.slice(0, 5000), // Limit text length
              authorName: pageId,
              authorId: pageId,
              timestamp,
              likes: 0,
              comments: 0,
              shares: 0,
              imageUrl,
              videoUrl,
            });
          }
        } catch (e) {
          // Skip problematic posts
          console.error('Error extracting post:', e);
        }
      }

      return results;
    }, { pageId, maxItems });

    return posts.map(post => this.transformPost(post));
  }

  async searchContent(query: string, options: FetchOptions = {}): Promise<RawContentItem[]> {
    console.log(`[Facebook] Search not supported, treating "${query}" as page ID`);
    return this.fetchContent(query, options);
  }

  async getSourceInfo(pageId: string): Promise<SourceInfo | null> {
    return {
      id: pageId,
      name: pageId,
      url: `https://www.facebook.com/${pageId}`,
    };
  }

  private transformPost(post: FacebookPost): RawContentItem {
    // Determine content type
    let type: ContentType = 'text';
    if (post.videoUrl) {
      type = 'video';
    } else if (post.imageUrl) {
      type = 'image';
    }

    // Extract title (first line or first 100 chars)
    const text = post.text || '';
    const firstLine = text.split('\n')[0] || '';
    const title = firstLine.length > 100 ? `${firstLine.slice(0, 97)}...` : firstLine || 'Facebook Post';

    // Collect media URLs
    const mediaUrls: string[] = [];
    if (post.imageUrl) {
      mediaUrls.push(post.imageUrl);
    }
    if (post.videoUrl) {
      mediaUrls.push(post.videoUrl);
    }

    return {
      platformId: post.postId,
      platform: 'facebook',
      type,
      title,
      description: text,
      thumbnailUrl: post.imageUrl || '',
      contentUrl: post.postUrl,
      mediaUrls,
      author: {
        id: post.authorId,
        name: post.authorName,
        handle: post.authorName,
        profileUrl: `https://www.facebook.com/${post.authorId}`,
      },
      platformMetrics: {
        likes: post.likes || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        lastUpdated: new Date(),
      },
      publishedAt: new Date(post.timestamp),
      tags: this.extractTags(text),
      language: this.detectLanguage(text),
    };
  }
}

export const facebookScraper = new FacebookScraper();
