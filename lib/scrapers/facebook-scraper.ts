import { BaseScraper, type FetchOptions, type RawContentItem, type SourceInfo } from './base-scraper';
import type { Platform, ContentType } from '@/lib/db/models/content';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface FacebookPost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  full_picture?: string;
  permalink_url: string;
  type?: string;
  shares?: { count: number };
  reactions?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
  attachments?: {
    data: Array<{
      type: string;
      url?: string;
      media?: {
        image?: { src: string };
        source?: string;
      };
      subattachments?: {
        data: Array<{
          media?: { image?: { src: string } };
        }>;
      };
    }>;
  };
}

interface FacebookPage {
  id: string;
  name: string;
  username?: string;
  picture?: { data: { url: string } };
  fan_count?: number;
  link?: string;
}

interface GraphAPIResponse<T> {
  data: T[];
  paging?: {
    cursors?: { after: string; before: string };
    next?: string;
  };
  error?: {
    message: string;
    code: number;
  };
}

export class FacebookScraper extends BaseScraper {
  platform: Platform = 'facebook';
  name = 'Facebook Scraper';

  private getAppAccessToken(): string {
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      throw new Error('Facebook credentials not configured');
    }
    return `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
  }

  private async graphRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const accessToken = this.getAppAccessToken();
    const searchParams = new URLSearchParams({
      access_token: accessToken,
      ...params,
    });

    const url = `${GRAPH_API_BASE}${endpoint}?${searchParams}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Facebook API Error: ${data.error.message}`);
    }

    return data;
  }

  async validateCredentials(): Promise<boolean> {
    try {
      if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
        return false;
      }

      // Test the app access token by getting app info
      await this.graphRequest(`/${FACEBOOK_APP_ID}`, { fields: 'id,name' });
      return true;
    } catch (error) {
      console.error('[Facebook] Credential validation failed:', error);
      return false;
    }
  }

  async fetchContent(pageId: string, options: FetchOptions = {}): Promise<RawContentItem[]> {
    const { maxItems = 50 } = options;
    const items: RawContentItem[] = [];

    try {
      // First get page info
      const pageInfo = await this.getSourceInfo(pageId);
      if (!pageInfo) {
        throw new Error(`Page not found: ${pageId}`);
      }

      // Fetch posts from the page
      // Note: This requires Page Public Content Access permission for public pages
      // or a Page Access Token for pages you manage
      const fields = [
        'id',
        'message',
        'story',
        'created_time',
        'full_picture',
        'permalink_url',
        'type',
        'shares',
        'reactions.summary(total_count)',
        'comments.summary(total_count)',
        'attachments{type,url,media,subattachments}',
      ].join(',');

      const response = await this.graphRequest<GraphAPIResponse<FacebookPost>>(
        `/${pageId}/posts`,
        {
          fields,
          limit: Math.min(maxItems, 100).toString(),
        }
      );

      if (!response.data) {
        console.warn('[Facebook] No posts data returned');
        return items;
      }

      for (const post of response.data) {
        if (items.length >= maxItems) break;

        const contentItem = this.transformPost(post, pageInfo);
        if (contentItem) {
          items.push(contentItem);
        }
      }

      // Handle pagination if needed
      let nextUrl = response.paging?.next;
      while (nextUrl && items.length < maxItems) {
        await this.delay(500); // Rate limiting

        const nextResponse = await fetch(nextUrl);
        const nextData: GraphAPIResponse<FacebookPost> = await nextResponse.json();

        if (nextData.error || !nextData.data) break;

        for (const post of nextData.data) {
          if (items.length >= maxItems) break;
          const contentItem = this.transformPost(post, pageInfo);
          if (contentItem) {
            items.push(contentItem);
          }
        }

        nextUrl = nextData.paging?.next;
      }

      console.log(`[Facebook] Fetched ${items.length} posts from ${pageInfo.name}`);
    } catch (error) {
      console.error('[Facebook] Error fetching content:', error);
      throw error;
    }

    return items;
  }

  async searchContent(query: string, options: FetchOptions = {}): Promise<RawContentItem[]> {
    const { maxItems = 50 } = options;
    const items: RawContentItem[] = [];

    try {
      // Search for pages matching the query
      // Note: Page search requires Page Public Content Access permission
      const response = await this.graphRequest<GraphAPIResponse<FacebookPage>>(
        '/pages/search',
        {
          q: query,
          fields: 'id,name,username,picture,fan_count,link',
          limit: '10',
        }
      );

      if (!response.data || response.data.length === 0) {
        console.warn('[Facebook] No pages found for query:', query);
        return items;
      }

      // Fetch posts from the first matching page
      const topPage = response.data[0];
      return this.fetchContent(topPage.id, { maxItems });
    } catch (error) {
      // Search endpoint often requires special permissions
      // Fall back to treating query as a page ID/username
      console.warn('[Facebook] Search failed, trying as page ID:', error);

      try {
        return await this.fetchContent(query, options);
      } catch {
        console.error('[Facebook] Could not fetch page:', query);
        throw error;
      }
    }
  }

  async getSourceInfo(pageId: string): Promise<SourceInfo | null> {
    try {
      const page = await this.graphRequest<FacebookPage>(`/${pageId}`, {
        fields: 'id,name,username,picture.width(200),fan_count,link',
      });

      return {
        id: page.id,
        name: page.name,
        url: page.link || `https://www.facebook.com/${page.username || page.id}`,
        subscriberCount: page.fan_count,
        avatarUrl: page.picture?.data?.url,
      };
    } catch (error) {
      console.error('[Facebook] Error getting page info:', error);
      return null;
    }
  }

  private transformPost(post: FacebookPost, pageInfo: SourceInfo): RawContentItem | null {
    // Skip posts without content
    const text = post.message || post.story || '';
    if (!text && !post.full_picture) {
      return null;
    }

    // Determine content type
    let type: ContentType = 'text';
    if (post.type === 'video' || post.attachments?.data?.some(a => a.type === 'video_inline')) {
      type = 'video';
    } else if (post.full_picture || post.attachments?.data?.some(a => a.type === 'photo')) {
      type = 'image';
    }

    // Extract title (first line or first 100 chars)
    const firstLine = text.split('\n')[0] || '';
    const title = firstLine.length > 100 ? `${firstLine.slice(0, 97)}...` : firstLine || 'Facebook Post';

    // Get thumbnail
    let thumbnailUrl = post.full_picture || '';
    if (!thumbnailUrl && post.attachments?.data?.[0]?.media?.image?.src) {
      thumbnailUrl = post.attachments.data[0].media.image.src;
    }

    // Collect media URLs
    const mediaUrls: string[] = [];
    if (post.full_picture) {
      mediaUrls.push(post.full_picture);
    }
    if (post.attachments?.data) {
      for (const attachment of post.attachments.data) {
        if (attachment.media?.image?.src) {
          mediaUrls.push(attachment.media.image.src);
        }
        if (attachment.subattachments?.data) {
          for (const sub of attachment.subattachments.data) {
            if (sub.media?.image?.src) {
              mediaUrls.push(sub.media.image.src);
            }
          }
        }
      }
    }

    return {
      platformId: post.id,
      platform: 'facebook',
      type,
      title,
      description: text,
      thumbnailUrl,
      contentUrl: post.permalink_url,
      mediaUrls: [...new Set(mediaUrls)], // Remove duplicates
      author: {
        id: pageInfo.id,
        name: pageInfo.name,
        handle: pageInfo.url.split('/').pop() || pageInfo.id,
        avatarUrl: pageInfo.avatarUrl,
        profileUrl: pageInfo.url,
      },
      platformMetrics: {
        likes: post.reactions?.summary?.total_count,
        comments: post.comments?.summary?.total_count,
        shares: post.shares?.count,
        lastUpdated: new Date(),
      },
      publishedAt: new Date(post.created_time),
      tags: this.extractTags(text),
      language: this.detectLanguage(text),
    };
  }
}

export const facebookScraper = new FacebookScraper();
