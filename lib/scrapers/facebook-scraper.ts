import { BaseScraper, type FetchOptions, type RawContentItem, type SourceInfo } from './base-scraper';
import type { Platform, ContentType } from '@/lib/db/models/content';
import { chromium, type Browser, type Page, type Cookie } from 'playwright';
import { downloadImage } from '@/lib/utils/image-downloader';

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
    const { maxItems = 50, onProgress } = options;

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

      // STEP 1: Scrape videos from Videos section (these have view counts)
      console.log(`[Facebook] Step 1: Fetching videos with view counts...`);
      if (onProgress) {
        await onProgress({ fetched: 0, total: maxItems, message: `סורק סרטונים...` });
      }
      const videoPosts = await this.fetchVideosWithViews(page, pageId, Math.floor(maxItems / 2));
      console.log(`[Facebook] Got ${videoPosts.length} videos with view counts`);

      // STEP 2: Scrape regular posts from the main feed
      console.log(`[Facebook] Step 2: Fetching posts from feed...`);
      if (onProgress) {
        await onProgress({ fetched: videoPosts.length, total: maxItems, message: `סורק פוסטים...` });
      }

      // Navigate directly to the page's posts section
      const pageUrl = `https://www.facebook.com/${pageId}/posts`;
      console.log(`[Facebook] Navigating to ${pageUrl}`);

      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Wait for page to load
      await page.waitForTimeout(4000);

      // Check current URL and page title
      const currentUrl = page.url();
      const pageTitle = await page.title();
      console.log(`[Facebook] Current URL: ${currentUrl}`);
      console.log(`[Facebook] Page title: ${pageTitle}`);

      // Check if we're on a login page
      if (currentUrl.includes('login') || pageTitle.includes('Log in') || pageTitle.includes('Log Into')) {
        throw new Error('Facebook requires login - cookies may have expired');
      }

      // Track seen content to avoid duplicates with videos
      const seenTexts = new Set<string>();
      for (const vp of videoPosts) {
        seenTexts.add(vp.text.slice(0, 100));
      }

      // Extract posts WHILE scrolling
      const feedPosts: FacebookPost[] = [];
      const remainingItems = maxItems - videoPosts.length;
      const maxScrolls = Math.min(remainingItems * 3, 300);
      let noNewPostsCount = 0;
      let lastPostCount = 0;

      console.log(`[Facebook] Starting feed extraction (target: ${remainingItems} more posts)...`);

      for (let i = 0; i < maxScrolls && feedPosts.length < remainingItems; i++) {
        // Extract the currently active post (the one with visible timestamp)
        const newPosts = await this.extractVisiblePosts(page, pageId, seenTexts);

        for (const post of newPosts) {
          if (feedPosts.length >= remainingItems) break;
          feedPosts.push(post);
        }

        // Check if we got new posts
        if (feedPosts.length === lastPostCount) {
          noNewPostsCount++;
          if (noNewPostsCount >= 20) {
            console.log(`[Facebook] No new posts after ${i + 1} scrolls, stopping`);
            break;
          }
        } else {
          noNewPostsCount = 0;
          lastPostCount = feedPosts.length;
        }

        // Scroll to load more content
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(1000);

        // Report progress
        if ((i + 1) % 5 === 0 || feedPosts.length !== lastPostCount) {
          console.log(`[Facebook] Scroll ${i + 1}: collected ${feedPosts.length}/${remainingItems} feed posts`);
          if (onProgress) {
            await onProgress({ fetched: videoPosts.length + feedPosts.length, total: maxItems, message: `סורק פוסטים...` });
          }
        }
      }

      // Debug: screenshot after scrolling
      await page.screenshot({ path: '/tmp/fb-after-scroll.png', fullPage: false });
      console.log('[Facebook] Screenshot saved to /tmp/fb-after-scroll.png');

      // Combine videos and feed posts
      const allPosts = [...videoPosts, ...feedPosts];
      console.log(`[Facebook] Total: ${allPosts.length} posts (${videoPosts.length} videos + ${feedPosts.length} feed posts)`);

      await context.close();

      // Transform posts and download images
      console.log(`[Facebook] Downloading images for ${allPosts.length} posts...`);
      if (onProgress) {
        await onProgress({ fetched: allPosts.length, total: maxItems, message: `מוריד תמונות...` });
      }
      const transformedPosts = await Promise.all(
        allPosts.map(post => this.transformPost(post))
      );
      console.log(`[Facebook] Image download complete`);
      if (onProgress) {
        await onProgress({ fetched: allPosts.length, total: maxItems, message: `הושלם` });
      }

      return transformedPosts;

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
        const cleaned = str.replace(/[,\s]/g, '');
        if (cleaned.includes('K') || cleaned.includes('אלף')) {
          return Math.round(parseFloat(cleaned.replace(/[Kאלף]/g, '')) * 1000);
        }
        if (cleaned.includes('M') || cleaned.includes('מיליון')) {
          return Math.round(parseFloat(cleaned.replace(/[Mמיליון]/g, '')) * 1000000);
        }
        return parseInt(cleaned, 10) || 0;
      };

      // Find ALL time links (various formats: "17h", "2d", "1w", "January 15", "Dec 20", etc.)
      const allLinks = Array.from(document.querySelectorAll('a'));
      const timeLinks = allLinks.filter(a => {
        const text = a.textContent?.trim() || '';
        const href = a.getAttribute('href') || '';
        // Must have a post URL
        if (!href.includes('/posts/') && !href.includes('pfbid')) return false;
        // Match relative time formats
        if (/^\d+(h|d|w|mo|y|m|s)$/.test(text)) return true;
        // Match "Just now", "Yesterday"
        if (/^(Just now|Yesterday)$/i.test(text)) return true;
        // Match date formats like "January 15", "Dec 20", "December 20, 2024"
        if (/^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i.test(text)) return true;
        return false;
      });

      // Extract a post from each time link found
      for (const timeLink of timeLinks) {
        try {
          const timeText = timeLink.textContent?.trim() || '';
          const postUrl = timeLink.getAttribute('href') || '';

          // Parse the time text into a timestamp
          let timestamp = new Date().toISOString();
          const relativeMatch = timeText.match(/^(\d+)(h|d|w|mo|y|m|s)$/);
          if (relativeMatch) {
            const num = parseInt(relativeMatch[1]);
            const unit = relativeMatch[2];
            const date = new Date();
            switch (unit) {
              case 's': date.setSeconds(date.getSeconds() - num); break;
              case 'm': date.setMinutes(date.getMinutes() - num); break;
              case 'h': date.setHours(date.getHours() - num); break;
              case 'd': date.setDate(date.getDate() - num); break;
              case 'w': date.setDate(date.getDate() - num * 7); break;
              case 'mo': date.setMonth(date.getMonth() - num); break;
              case 'y': date.setFullYear(date.getFullYear() - num); break;
            }
            timestamp = date.toISOString();
          } else if (/^Just now$/i.test(timeText)) {
            timestamp = new Date().toISOString();
          } else if (/^Yesterday$/i.test(timeText)) {
            const date = new Date();
            date.setDate(date.getDate() - 1);
            timestamp = date.toISOString();
          } else {
            // Try to parse date format like "January 15" or "Dec 20, 2024"
            try {
              const parsed = new Date(timeText);
              if (!isNaN(parsed.getTime())) {
                timestamp = parsed.toISOString();
              }
            } catch { /* use default */ }
          }

          // Traverse UP from time link to find post container (need ~18 levels to reach full post)
          let container: Element = timeLink;
          for (let i = 0; i < 18; i++) {
            if (!container.parentElement) break;
            container = container.parentElement;
          }

          // Extract post text - traverse up more to get full post container
          let fullContainer = container;
          for (let i = 0; i < 5; i++) {
            if (fullContainer.parentElement) {
              fullContainer = fullContainer.parentElement;
            }
          }

          const allText = (fullContainer as HTMLElement).innerText || '';
          const lines = allText.split('\n').filter(l => l.trim().length > 10);

          let postText = '';
          for (const line of lines) {
            const trimmed = line.trim();
            // Skip UI elements but be more permissive
            if (trimmed.match(/^(Like|Comment|Share|See more|All comments)$/i) ||
                trimmed.match(/^\d+[KM]?\s*(likes?|comments?|shares?|views?)$/i) ||
                trimmed.match(/^and \d+ others$/) ||
                trimmed.match(/^(Yesterday|Just now|\d+[hdwmys])$/i)) {
              continue;
            }
            // Accept Hebrew text with meaningful length
            if (trimmed.match(/[\u0590-\u05FF]/) && trimmed.length > 15) {
              // Skip if it's just the page name line (handle RTL marks with \u200E, \u200F, \u202A-\u202E)
              const cleanText = trimmed.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
              if (cleanText.match(/^מפלגת זהות.*בראשות משה פייגלין$/)) continue;
              if (cleanText.match(/^(is with|עם)\s/i)) continue;
              // Skip page names that might appear
              if (cleanText === pageId || cleanText.startsWith(pageId + ' ')) continue;
              postText = trimmed;
              break;
            }
            // Or long English text
            if (trimmed.length > 50 && !trimmed.includes('Verified') && !trimmed.includes('followers')) {
              postText = trimmed;
              break;
            }
          }

          if (!postText || postText.length < 10) continue;

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

          // Views - format is typically: "6 days ago 8K views" or "4 weeks ago 5.4K views"
          // Match number+K/M immediately before "views"
          let viewsMatch = allText.match(/([\d,.]+)\s*([KM])\s*views/i);
          if (!viewsMatch) {
            // Try plain number before "views" (e.g., "771 views")
            viewsMatch = allText.match(/([\d,]+)\s+views/i);
          }
          if (!viewsMatch) {
            // Hebrew patterns - number before צפיות
            viewsMatch = allText.match(/([\d,.]+)\s*([אלף]*)\s*צפיות/i);
          }
          if (!viewsMatch) {
            // Look for view count in aria-label
            const viewEl = container.querySelector('[aria-label*="צפיות"], [aria-label*="views"]');
            if (viewEl) {
              const label = viewEl.getAttribute('aria-label') || '';
              viewsMatch = label.match(/([\d,.]+)\s*([KMאלף]*)\s*views/i) || label.match(/([\d,.]+[KMאלף]*)/);
            }
          }

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

          // Detect if this is a video post (Facebook lazy-loads videos)
          const video = container.querySelector('video');
          let videoUrl = video?.getAttribute('src') || null;
          let videoPoster = video?.getAttribute('poster') || null;

          // Better video detection: look for video indicators
          const isVideoPost = !!(
            video ||
            container.querySelector('[data-video-id]') ||
            container.querySelector('[aria-label*="video"]') ||
            container.querySelector('[aria-label*="וידאו"]') ||
            postUrl.includes('/videos/') ||
            postUrl.includes('/watch/') ||
            postUrl.includes('/reel/') ||
            allText.match(/צפיות|views/i) // Videos typically show view count
          );

          // If video post detected, mark videoUrl even without actual video element
          if (isVideoPost && !videoUrl) {
            videoUrl = postUrl; // Use post URL as video URL
          }

          // If video exists but no poster, look for thumbnail in various places
          if (isVideoPost && !videoPoster) {
            // Look for background-image on parent elements (Facebook often uses this)
            let parent: Element | null = video?.parentElement || container;
            for (let i = 0; i < 8 && parent; i++) {
              const style = (parent as HTMLElement).style?.backgroundImage;
              if (style && style.includes('url(')) {
                const urlMatch = style.match(/url\(["']?([^"')]+)["']?\)/);
                if (urlMatch && urlMatch[1].includes('scontent')) {
                  videoPoster = urlMatch[1];
                  break;
                }
              }
              parent = parent.parentElement;
            }
          }

          // Look for video thumbnail in aria-label or data attributes
          if (isVideoPost && !videoPoster) {
            const videoContainer = container.querySelector('[data-video-id], [aria-label*="video"], [aria-label*="וידאו"]');
            if (videoContainer) {
              const bgImg = videoContainer.querySelector('img[src*="scontent"]');
              if (bgImg) {
                videoPoster = bgImg.getAttribute('src');
              }
            }
          }

          // If no image found but video has poster, use that
          if (!imageUrl && videoPoster) {
            imageUrl = videoPoster;
          }

          // For videos without thumbnail, look for the largest image in the container
          if (isVideoPost && !imageUrl) {
            let bestImg: string | null = null;
            let bestSize = 0;
            for (const img of images) {
              const src = img.getAttribute('src') || '';
              if (src.includes('scontent') || src.includes('fbcdn')) {
                const width = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || 0;
                const height = (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height || 0;
                const size = width * height;
                if (size > bestSize || (!bestImg && src.length > 50)) {
                  bestSize = size;
                  bestImg = src;
                }
              }
            }
            if (bestImg) {
              imageUrl = bestImg;
            }
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

  /**
   * Fetch videos directly from the Videos section with view counts
   * Extract video info from the grid view (views are shown on thumbnails)
   */
  private async fetchVideosWithViews(page: Page, pageId: string, maxVideos: number): Promise<FacebookPost[]> {
    const videoPosts: FacebookPost[] = [];

    try {
      // Navigate to the Videos section
      const videosUrl = `https://www.facebook.com/${pageId}/videos`;
      console.log(`[Facebook] Navigating to ${videosUrl}`);
      await page.goto(videosUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      // Scroll to load more videos
      const scrollCount = Math.min(Math.ceil(maxVideos / 3), 15);
      for (let i = 0; i < scrollCount; i++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await page.waitForTimeout(1000);
      }

      // Take debug screenshot
      await page.screenshot({ path: '/tmp/fb-videos-section.png', fullPage: false });

      // Extract video info directly from the grid (views are on thumbnails)
      const videos = await page.evaluate((args) => {
        const { pageId, maxVideos } = args;
        const results: any[] = [];

        const parseNum = (str: string | undefined): number => {
          if (!str) return 0;
          const cleaned = str.replace(/[,\s]/g, '').toLowerCase();
          if (cleaned.includes('k') || cleaned.includes('אלף')) {
            return Math.round(parseFloat(cleaned.replace(/[kאלף]/g, '')) * 1000);
          }
          if (cleaned.includes('m') || cleaned.includes('מיליון')) {
            return Math.round(parseFloat(cleaned.replace(/[mמיליון]/g, '')) * 1000000);
          }
          return parseInt(cleaned, 10) || 0;
        };

        // Find all video links - group by video ID and prefer links with Hebrew slugs
        const videoLinks = document.querySelectorAll('a[href*="/videos/"]');
        const videoLinksMap = new Map<string, { link: Element; href: string; hasSlug: boolean }>();

        // First pass: collect all links and prefer those with Hebrew slugs
        for (const link of videoLinks) {
          const href = link.getAttribute('href') || '';
          // Match both patterns:
          // 1. /videos/NUMERIC_ID (direct link)
          // 2. /videos/SLUG/NUMERIC_ID (link with Hebrew title slug)
          const videoIdMatch = href.match(/\/videos\/(?:[^/]+\/)?(\d+)/);
          if (!videoIdMatch) continue;

          const videoId = videoIdMatch[1];
          if (!videoId) continue;

          // Check if this URL has a Hebrew slug (contains URL-encoded Hebrew or actual Hebrew)
          let hasSlug = false;
          try {
            hasSlug = /\/videos\/[^/]+\/\d+/.test(href) && (
              /%D7%/.test(href) || // URL-encoded Hebrew
              /[\u0590-\u05FF]/.test(decodeURIComponent(href)) // Direct Hebrew
            );
          } catch {
            // decodeURIComponent failed, treat as no slug
          }

          // Keep this link if it's the first one or if it has a slug (better for title extraction)
          const existing = videoLinksMap.get(videoId);
          if (!existing || (hasSlug && !existing.hasSlug)) {
            videoLinksMap.set(videoId, { link, href, hasSlug });
          }
        }

        // Second pass: process the preferred links
        for (const [videoId, { link, href }] of videoLinksMap) {
          if (results.length >= maxVideos) break;

          // Build clean URL without slug for storage consistency
          const fullUrl = `https://www.facebook.com/${pageId}/videos/${videoId}/`;

          // Look for view count and timestamp in sibling elements after the link
          // DOM structure: <link> -> <text: "X days ago YK views"> -> <toolbar>
          let views = 0;
          let relativeTime = '';
          let sibling = link.nextElementSibling;
          for (let i = 0; i < 5 && sibling; i++) {
            const siblingText = sibling.textContent || '';
            // Match patterns like "6 days ago 8K views", "4 weeks ago 5.4K views"
            const fullMatch = siblingText.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago\s+([\d,.]+)\s*([KM])?\s*views/i);
            if (fullMatch) {
              relativeTime = `${fullMatch[1]} ${fullMatch[2]}s ago`;
              const numStr = fullMatch[3] + (fullMatch[4] || '');
              views = parseNum(numStr);
              break;
            }
            // Try just views pattern
            const viewMatch = siblingText.match(/([\d,.]+)\s*([KM])\s*views/i) ||
                              siblingText.match(/([\d,]+)\s+views/i);
            if (viewMatch) {
              const numStr = viewMatch[1] + (viewMatch[2] || '');
              views = parseNum(numStr);
            }
            // Try just time pattern
            const timeMatch = siblingText.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago/i);
            if (timeMatch) {
              relativeTime = `${timeMatch[1]} ${timeMatch[2]}s ago`;
            }
            if (views > 0 && relativeTime) break;
            sibling = sibling.nextElementSibling;
          }

          // Also try parent's siblings if not found
          if (views === 0 || !relativeTime) {
            let parent = link.parentElement;
            for (let p = 0; p < 3 && parent && (views === 0 || !relativeTime); p++) {
              let parentSibling = parent.nextElementSibling;
              for (let i = 0; i < 5 && parentSibling; i++) {
                const sibText = parentSibling.textContent || '';
                const fullMatch = sibText.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago\s+([\d,.]+)\s*([KM])?\s*views/i);
                if (fullMatch) {
                  if (!relativeTime) relativeTime = `${fullMatch[1]} ${fullMatch[2]}s ago`;
                  if (views === 0) {
                    const numStr = fullMatch[3] + (fullMatch[4] || '');
                    views = parseNum(numStr);
                  }
                  break;
                }
                if (views === 0) {
                  const viewMatch = sibText.match(/([\d,.]+)\s*([KM])\s*views/i) ||
                                    sibText.match(/([\d,]+)\s+views/i);
                  if (viewMatch) {
                    const numStr = viewMatch[1] + (viewMatch[2] || '');
                    views = parseNum(numStr);
                  }
                }
                if (!relativeTime) {
                  const timeMatch = sibText.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago/i);
                  if (timeMatch) {
                    relativeTime = `${timeMatch[1]} ${timeMatch[2]}s ago`;
                  }
                }
                if (views > 0 && relativeTime) break;
                parentSibling = parentSibling.nextElementSibling;
              }
              parent = parent.parentElement;
            }
          }

          // Parse relative time to timestamp
          let timestamp = new Date().toISOString();
          if (relativeTime) {
            const timeMatch = relativeTime.match(/(\d+)\s*(second|minute|hour|day|week|month|year)/i);
            if (timeMatch) {
              const num = parseInt(timeMatch[1]);
              const unit = timeMatch[2].toLowerCase();
              const date = new Date();
              switch (unit) {
                case 'second': date.setSeconds(date.getSeconds() - num); break;
                case 'minute': date.setMinutes(date.getMinutes() - num); break;
                case 'hour': date.setHours(date.getHours() - num); break;
                case 'day': date.setDate(date.getDate() - num); break;
                case 'week': date.setDate(date.getDate() - num * 7); break;
                case 'month': date.setMonth(date.getMonth() - num); break;
                case 'year': date.setFullYear(date.getFullYear() - num); break;
              }
              timestamp = date.toISOString();
            }
          }

          // Find the container for text extraction
          let container: Element | null = link;
          for (let i = 0; i < 10; i++) {
            if (!container?.parentElement) break;
            container = container.parentElement;
            const rect = container.getBoundingClientRect();
            if (rect.width > 200 && rect.height > 150) break;
          }

          if (!container) continue;

          const containerText = (container as HTMLElement).innerText || '';

          // Extract title/description using multiple strategies
          let text = '';
          const linkText = (link.textContent || '').trim();

          // Strategy 1: Link text itself (for title links with Hebrew text)
          if (linkText.length > 20 && linkText.match(/[\u0590-\u05FF]/)) {
            text = linkText;
          }

          // Strategy 2: Look for nearby sibling links that might be title links
          // In grid view, title is often a separate link next to the thumbnail
          if (!text) {
            let parent = link.parentElement;
            for (let p = 0; p < 5 && parent && !text; p++) {
              // Check sibling links that might contain the title
              const siblingLinks = parent.querySelectorAll('a[href*="/videos/"]');
              for (const sibLink of siblingLinks) {
                if (sibLink === link) continue;
                const sibText = (sibLink.textContent || '').trim();
                if (sibText.length > 20 && sibText.match(/[\u0590-\u05FF]/)) {
                  // Skip if it's just UI text
                  if (!sibText.match(/^(Most Popular|Videos|Reels|All videos)/i)) {
                    text = sibText;
                    break;
                  }
                }
              }
              parent = parent.parentElement;
            }
          }

          // Strategy 3: Container text extraction
          if (!text) {
            const lines = containerText.split('\n')
              .map(l => l.trim())
              .filter(l => l.length > 15);

            for (const line of lines) {
              // Skip UI elements and metrics
              if (line.match(/^\d+[KM]?\s*(views?|צפיות|likes?|comments?)/i)) continue;
              if (line.match(/^(Most Popular|Videos|Reels|All videos)/i)) continue;
              if (line.match(/^\d+\s*(second|minute|hour|day|week|month|year)s?\s+ago/i)) continue;
              // Prefer Hebrew text
              if (line.match(/[\u0590-\u05FF]/) && line.length > 20) {
                text = line;
                break;
              }
            }
          }

          // Strategy 4: Extract from URL slug (Hebrew titles are URL-encoded in the path)
          // Pattern: /videos/HEBREW-SLUG/NUMERIC_ID/
          if (!text) {
            try {
              const decodedUrl = decodeURIComponent(href);
              const slugMatch = decodedUrl.match(/\/videos\/([^/]+)\/\d+/);
              if (slugMatch && slugMatch[1].match(/[\u0590-\u05FF]/)) {
                // Convert dashes back to spaces
                text = slugMatch[1].replace(/-/g, ' ').trim();
              }
            } catch (e) {
              // URL decoding failed, skip
            }
          }

          // Find thumbnail image
          let imageUrl: string | null = null;
          const images = container.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
          for (const img of images) {
            const src = img.getAttribute('src') || '';
            const width = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || 0;
            if (width > 100 || src.length > 50) {
              imageUrl = src;
              break;
            }
          }

          // Get duration if available
          const durationMatch = containerText.match(/(\d{1,2}):(\d{2})/);

          if (text || views > 0) {
            results.push({
              postId: videoId,
              postUrl: fullUrl,
              text: text.slice(0, 5000) || `סרטון מתוך ${pageId}`,
              authorName: pageId,
              authorId: pageId,
              timestamp,
              likes: 0,
              comments: 0,
              shares: 0,
              views,
              imageUrl,
              videoUrl: fullUrl,
              duration: durationMatch ? `${durationMatch[1]}:${durationMatch[2]}` : null,
            });
          }
        }

        return results;
      }, { pageId, maxVideos });

      console.log(`[Facebook] Extracted ${videos.length} videos from grid`);

      // Log what we found
      for (const video of videos) {
        console.log(`[Facebook] Video: "${(video.text || '').slice(0, 40)}..." - ${video.views} views`);
        videoPosts.push(video as FacebookPost);
      }

    } catch (error) {
      console.error('[Facebook] Error fetching videos:', error);
    }

    return videoPosts;
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

  private async transformPost(post: FacebookPost): Promise<RawContentItem> {
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

    // Download image locally (Facebook CDN URLs expire)
    let thumbnailUrl = '';
    if (post.imageUrl) {
      const localPath = await downloadImage(post.imageUrl, 'facebook');
      thumbnailUrl = localPath || post.imageUrl; // Fallback to original URL if download fails
    }

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
      thumbnailUrl,
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
