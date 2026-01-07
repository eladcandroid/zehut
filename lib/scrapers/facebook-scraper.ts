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
  views: number;
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

      // Navigate to the page (not /posts - main page works better)
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

      // Extract posts WHILE scrolling (Facebook virtualizes - removes posts as you scroll)
      const allPosts: FacebookPost[] = [];
      const seenTexts = new Set<string>();
      const maxScrolls = Math.min(Math.ceil(maxItems * 1.5), 200);
      let noNewPostsCount = 0;
      let lastPostCount = 0;

      console.log(`[Facebook] Starting incremental extraction (target: ${maxItems} posts)...`);

      for (let i = 0; i < maxScrolls && allPosts.length < maxItems; i++) {
        // Extract current visible posts
        const newPosts = await this.extractVisiblePosts(page, pageId, seenTexts);

        for (const post of newPosts) {
          if (allPosts.length >= maxItems) break;
          allPosts.push(post);
        }

        // Check if we got new posts
        if (allPosts.length === lastPostCount) {
          noNewPostsCount++;
          if (noNewPostsCount >= 10) {
            console.log(`[Facebook] No new posts after ${i + 1} scrolls, stopping`);
            break;
          }
        } else {
          noNewPostsCount = 0;
          lastPostCount = allPosts.length;
        }

        // Scroll down
        await page.evaluate(() => window.scrollBy(0, 800));
        await page.waitForTimeout(1000);

        // Log progress
        if ((i + 1) % 10 === 0) {
          console.log(`[Facebook] Scroll ${i + 1}: collected ${allPosts.length}/${maxItems} posts`);
        }
      }

      // Debug: screenshot after scrolling
      await page.screenshot({ path: '/tmp/fb-after-scroll.png', fullPage: false });
      console.log('[Facebook] Screenshot saved to /tmp/fb-after-scroll.png');

      console.log(`[Facebook] Extracted ${allPosts.length} posts from ${pageId}`);

      await context.close();

      return allPosts.map(post => this.transformPost(post));

    } catch (error) {
      console.error('[Facebook] Error fetching content:', error);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  private async extractVisiblePosts(page: Page, pageId: string, seenTexts: Set<string>): Promise<FacebookPost[]> {
    const seenArray = Array.from(seenTexts);

    const posts = await page.evaluate((args) => {
      const { pageId, seenArray } = args;
      const seenSet = new Set(seenArray);
      const results: any[] = [];

      // Helper to parse numbers with K/M suffixes
      const parseNum = (str: string | undefined) => {
        if (!str) return 0;
        const cleaned = str.replace(/,/g, '');
        if (cleaned.includes('K')) return Math.round(parseFloat(cleaned) * 1000);
        if (cleaned.includes('M')) return Math.round(parseFloat(cleaned) * 1000000);
        return parseInt(cleaned, 10) || 0;
      };

      // Find posts by looking for Like count elements (aria-label="Like: X people")
      const allElements = Array.from(document.querySelectorAll('*'));
      const likeCountElements = allElements.filter(el => {
        const aria = el.getAttribute('aria-label') || '';
        return aria.match(/Like:\s*\d+/);
      });

      for (const likeEl of likeCountElements) {
        try {
          // Get like count from aria-label
          const ariaLabel = likeEl.getAttribute('aria-label') || '';
          const likesMatch = ariaLabel.match(/Like:\s*(\d+)/);
          const likes = likesMatch ? parseInt(likesMatch[1]) : 0;

          // Traverse up to find post container (about 15-20 levels up)
          let container = likeEl;
          for (let i = 0; i < 20; i++) {
            if (!container.parentElement) break;
            container = container.parentElement;
          }

          // Extract all text from container
          const allText = container.innerText || '';
          const lines = allText.split('\n').filter(l => l.trim().length > 15);

          // Find main post text (Hebrew text, not page name or button labels)
          let postText = '';
          for (const line of lines) {
            const trimmed = line.trim();
            // Skip if it's the page name, button text, or reaction names
            if (trimmed.includes('מפלגת זהות') ||
                trimmed.includes('Like') ||
                trimmed.includes('Comment') ||
                trimmed.includes('Share') ||
                trimmed.includes('See more') ||
                trimmed.match(/^\d+[KM]?\s*(likes?|comments?|shares?|views?)/i) ||
                trimmed.match(/and \d+ others$/)) {
              continue;
            }
            // Look for Hebrew content or substantial English text
            if ((trimmed.match(/[\u0590-\u05FF]/) && trimmed.length > 20) ||
                (trimmed.length > 50 && !trimmed.includes('Verified'))) {
              postText = trimmed;
              break;
            }
          }

          // Skip if no text or already seen
          if (!postText || postText.length < 15) continue;

          const textKey = postText.slice(0, 100);
          if (seenSet.has(textKey)) continue;
          seenSet.add(textKey);

          // Find post URL from links with pfbid or post patterns
          let postUrl = '';
          let postId = '';
          const links = container.querySelectorAll('a[href*="pfbid"], a[href*="/posts/"]');
          for (const link of links) {
            const href = link.getAttribute('href') || '';
            if (href.includes('pfbid') || href.includes('/posts/')) {
              postUrl = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
              // Extract ID from pfbid or posts URL
              const pfbidMatch = href.match(/pfbid([a-zA-Z0-9]+)/);
              const postsMatch = href.match(/\/posts\/(\d+)/);
              postId = pfbidMatch?.[1] || postsMatch?.[1] || '';
              break;
            }
          }

          if (!postId) {
            postId = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
          }

          // Extract metrics from container text
          const commentsMatch = allText.match(/(\d+)\s*comment/i);
          const sharesMatch = allText.match(/(\d+)\s*share/i);
          const viewsMatch = allText.match(/([\d.]+[KM]?)\s*views?/i);

          // Find images (skip small ones and profile pics)
          const images = container.querySelectorAll('img[src*="scontent"]');
          let imageUrl: string | null = null;
          for (const img of images) {
            const src = img.getAttribute('src') || '';
            const width = img.getAttribute('width');
            // Skip small images (profile pics, icons)
            if (width && parseInt(width) < 100) continue;
            if (src.includes('50x50') || src.includes('40x40') || src.includes('_s.')) continue;
            imageUrl = src;
            break;
          }

          // Check for video
          const video = container.querySelector('video');
          const videoUrl = video?.getAttribute('src') || null;

          results.push({
            postId,
            postUrl: postUrl || `https://www.facebook.com/${pageId}`,
            text: postText.slice(0, 5000),
            authorName: pageId,
            authorId: pageId,
            timestamp: new Date().toISOString(),
            likes,
            comments: commentsMatch ? parseInt(commentsMatch[1]) : 0,
            shares: sharesMatch ? parseInt(sharesMatch[1]) : 0,
            views: parseNum(viewsMatch?.[1]),
            imageUrl,
            videoUrl,
          });
        } catch (e) {
          // Skip problematic posts
        }
      }

      return { posts: results, newSeenTexts: Array.from(seenSet) };
    }, { pageId, seenArray });

    // Update the seenTexts set with new entries
    for (const text of posts.newSeenTexts) {
      seenTexts.add(text);
    }

    return posts.posts;
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
        views: post.views || 0,
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
