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

      // Extract posts WHILE scrolling - scroll slowly so each post becomes "active"
      // Facebook only shows timestamp for the currently active/focused post
      const allPosts: FacebookPost[] = [];
      const seenTexts = new Set<string>();
      const maxScrolls = Math.min(maxItems * 3, 500); // More scrolls needed since we get ~1 post per scroll
      let noNewPostsCount = 0;
      let lastPostCount = 0;

      console.log(`[Facebook] Starting incremental extraction (target: ${maxItems} posts)...`);

      for (let i = 0; i < maxScrolls && allPosts.length < maxItems; i++) {
        // Extract the currently active post (the one with visible timestamp)
        const newPosts = await this.extractVisiblePosts(page, pageId, seenTexts);

        for (const post of newPosts) {
          if (allPosts.length >= maxItems) break;
          allPosts.push(post);
        }

        // Check if we got new posts
        if (allPosts.length === lastPostCount) {
          noNewPostsCount++;
          if (noNewPostsCount >= 20) { // Increased threshold
            console.log(`[Facebook] No new posts after ${i + 1} scrolls, stopping`);
            break;
          }
        } else {
          noNewPostsCount = 0;
          lastPostCount = allPosts.length;
        }

        // Scroll by smaller amount to ensure each post becomes active
        await page.evaluate(() => window.scrollBy(0, 400));
        await page.waitForTimeout(800);

        // Log progress
        if ((i + 1) % 20 === 0) {
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

    // New strategy: Find the ONE visible time link, extract THAT post
    // Facebook only renders timestamp for the "active" post in viewport
    const posts = await page.evaluate((args) => {
      const { pageId, seenArray } = args;
      const seenSet = new Set(seenArray);
      const results: any[] = [];

      const parseNum = (str: string | undefined) => {
        if (!str) return 0;
        const cleaned = str.replace(/,/g, '');
        if (cleaned.includes('K')) return Math.round(parseFloat(cleaned) * 1000);
        if (cleaned.includes('M')) return Math.round(parseFloat(cleaned) * 1000000);
        return parseInt(cleaned, 10) || 0;
      };

      // Find ALL time links (format: "17h", "2d", "1w", etc.)
      const allLinks = Array.from(document.querySelectorAll('a'));
      const timeLinks = allLinks.filter(a => {
        const text = a.textContent?.trim() || '';
        return /^\d+(h|d|w|mo|y)$/.test(text);
      });

      // Extract a post from each time link found
      for (const timeLink of timeLinks) {
        try {
          const timeText = timeLink.textContent?.trim() || '';
          const postUrl = timeLink.getAttribute('href') || '';

          // Parse the relative time
          const timeMatch = timeText.match(/^(\d+)(h|d|w|mo|y)$/);
          let timestamp = new Date().toISOString();
          if (timeMatch) {
            const num = parseInt(timeMatch[1]);
            const unit = timeMatch[2];
            const date = new Date();
            switch (unit) {
              case 'h': date.setHours(date.getHours() - num); break;
              case 'd': date.setDate(date.getDate() - num); break;
              case 'w': date.setDate(date.getDate() - num * 7); break;
              case 'mo': date.setMonth(date.getMonth() - num); break;
              case 'y': date.setFullYear(date.getFullYear() - num); break;
            }
            timestamp = date.toISOString();
          }

          // Traverse UP from time link to find post container (need ~18 levels to reach full post)
          let container: Element = timeLink;
          for (let i = 0; i < 18; i++) {
            if (!container.parentElement) break;
            container = container.parentElement;
          }

          // Extract post text
          const allText = (container as HTMLElement).innerText || '';
          const lines = allText.split('\n').filter(l => l.trim().length > 15);

          let postText = '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes('מפלגת זהות') ||
                trimmed.includes('Like') ||
                trimmed.includes('Comment') ||
                trimmed.includes('Share') ||
                trimmed.includes('See more') ||
                trimmed.match(/^\d+[KM]?\s*(likes?|comments?|shares?|views?)/i) ||
                trimmed.match(/and \d+ others$/)) {
              continue;
            }
            if ((trimmed.match(/[\u0590-\u05FF]/) && trimmed.length > 20) ||
                (trimmed.length > 50 && !trimmed.includes('Verified'))) {
              postText = trimmed;
              break;
            }
          }

          if (!postText || postText.length < 15) continue;

          const textKey = postText.slice(0, 100);
          if (seenSet.has(textKey)) continue;
          seenSet.add(textKey);

          // Extract post ID from URL
          let postId = '';
          const pfbidMatch = postUrl.match(/pfbid([a-zA-Z0-9]+)/);
          const postsMatch = postUrl.match(/\/posts\/(\d+)/);
          postId = pfbidMatch?.[1] || postsMatch?.[1] || `fb-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

          // Find Like count in container
          const likeEl = container.querySelector('[aria-label*="Like:"]');
          const likeLabel = likeEl?.getAttribute('aria-label') || '';
          const likesMatch = likeLabel.match(/Like:\s*(\d+)/);
          const likes = likesMatch ? parseInt(likesMatch[1]) : 0;

          // Extract metrics - include Hebrew patterns
          const commentsMatch = allText.match(/(\d+)\s*(comment|תגובו)/i);
          const sharesMatch = allText.match(/(\d+)\s*(share|שיתופ)/i);
          // Views: "1.2K views", "5K צפיות", "1,234 views"
          const viewsMatch = allText.match(/([\d,.]+[KM]?)\s*(views?|צפיות)/i);

          // Find image - look for post images (larger than profile pics)
          const images = container.querySelectorAll('img');
          let imageUrl: string | null = null;
          for (const img of images) {
            const src = img.getAttribute('src') || '';
            // Skip small images (profile pics, icons)
            if (src.includes('50x50') || src.includes('40x40') || src.includes('_s.') ||
                src.includes('emoji') || src.includes('rsrc.php')) continue;
            // Prefer scontent (Facebook CDN) images
            if (src.includes('scontent') || src.includes('fbcdn')) {
              // Check image dimensions if available
              const width = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || 0;
              if (width > 100 || !imageUrl) {
                imageUrl = src;
                if (width > 200) break; // Found a good-sized image
              }
            }
          }

          // Also look for video poster/thumbnail
          const video = container.querySelector('video');
          const videoUrl = video?.getAttribute('src') || null;
          const videoPoster = video?.getAttribute('poster') || null;

          // If no image found but video has poster, use that
          if (!imageUrl && videoPoster) {
            imageUrl = videoPoster;
          }

          results.push({
            postId,
            postUrl: postUrl.startsWith('http') ? postUrl : `https://www.facebook.com${postUrl}`,
            text: postText.slice(0, 5000),
            authorName: pageId,
            authorId: pageId,
            timestamp,
            likes,
            comments: commentsMatch ? parseInt(commentsMatch[1]) : 0,
            shares: sharesMatch ? parseInt(sharesMatch[1]) : 0,
            views: viewsMatch ? parseNum(viewsMatch[1]) : 0,
            imageUrl,
            videoUrl,
          });
        } catch (e) {
          // Skip problematic posts
        }
      }

      return { posts: results, newSeenTexts: Array.from(seenSet) };
    }, { pageId, seenArray });

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
