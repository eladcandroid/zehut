import {
  BaseScraper,
  type FetchOptions,
  type RawContentItem,
  type SourceInfo,
} from './base-scraper';
import type { Platform, ContentType } from '@/lib/db/models/content';

// Instagram scraping via the unofficial i.instagram.com API
// No API key or browser required — works on Vercel serverless
// Supports pagination: first page via web_profile_info, subsequent pages via feed/user endpoint
// Returns up to maxItems posts (capped at 5 pages of 12)

const IG_API_BASE = 'https://i.instagram.com/api/v1';
const IG_APP_ID = '936619743392459';
const IG_USER_AGENT =
  'Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)';

interface IGUser {
  id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  profile_pic_url_hd?: string;
  edge_followed_by: { count: number };
  edge_owner_to_timeline_media: {
    count: number;
    edges: IGPostEdge[];
    page_info: {
      has_next_page: boolean;
      end_cursor: string | null;
    };
  };
}

interface IGPostEdge {
  node: {
    id: string;
    shortcode: string;
    __typename: string;
    display_url: string;
    thumbnail_src?: string;
    is_video: boolean;
    video_url?: string;
    taken_at_timestamp: number;
    edge_liked_by?: { count: number };
    edge_media_to_comment?: { count: number };
    edge_media_to_caption?: { edges: Array<{ node: { text: string } }> };
    edge_sidecar_to_children?: { edges: Array<{ node: { display_url: string; is_video: boolean } }> };
  };
}

interface IGFeedItem {
  id: string;
  code: string;
  media_type: number; // 1=photo, 2=video, 8=carousel
  caption: { text: string } | null;
  image_versions2: { candidates: Array<{ url: string }> };
  like_count: number;
  comment_count: number;
  taken_at: number;
  user: { username: string; full_name: string; profile_pic_url: string };
}

interface IGFeedResponse {
  items: IGFeedItem[];
  more_available: boolean;
  next_max_id: string | null;
}

export class InstagramScraper extends BaseScraper {
  platform: Platform = 'instagram';
  name = 'Instagram Scraper';

  /**
   * Fetch user profile + posts from Instagram's unofficial API.
   */
  private async fetchUserProfile(username: string): Promise<IGUser | null> {
    try {
      const res = await fetch(
        `${IG_API_BASE}/users/web_profile_info/?username=${encodeURIComponent(username)}`,
        {
          headers: {
            'User-Agent': IG_USER_AGENT,
            'X-IG-App-ID': IG_APP_ID,
          },
        }
      );

      if (!res.ok) {
        console.error(`[Instagram] API returned ${res.status} for @${username}`);
        return null;
      }

      const data = await res.json();
      return data?.data?.user || null;
    } catch (error) {
      console.error('[Instagram] API request failed:', error);
      return null;
    }
  }

  /**
   * Fetch a subsequent page of posts using the feed/user endpoint.
   */
  private async fetchFeedPage(userId: string, maxId: string): Promise<IGFeedResponse | null> {
    try {
      const res = await fetch(
        `${IG_API_BASE}/feed/user/${userId}/?count=12&max_id=${encodeURIComponent(maxId)}`,
        {
          headers: {
            'User-Agent': IG_USER_AGENT,
            'X-IG-App-ID': IG_APP_ID,
          },
        }
      );

      if (!res.ok) {
        console.error(`[Instagram] Feed API returned ${res.status} for userId ${userId}`);
        return null;
      }

      return await res.json();
    } catch (error) {
      console.error('[Instagram] Feed API request failed:', error);
      return null;
    }
  }

  /**
   * Convert an IGFeedItem (from feed/user endpoint) to a RawContentItem.
   */
  private feedItemToRaw(
    item: IGFeedItem,
    username: string,
    authorName: string,
    avatarUrl: string
  ): RawContentItem {
    const caption = item.caption?.text || '';
    let type: ContentType = 'image';
    if (item.media_type === 2) {
      type = 'video';
    }
    // media_type 8 = carousel, treat as image

    return {
      platformId: item.code,
      platform: 'instagram',
      type,
      title: caption.slice(0, 100) + (caption.length > 100 ? '...' : ''),
      description: caption,
      thumbnailUrl: item.image_versions2?.candidates?.[0]?.url || '',
      contentUrl: `https://www.instagram.com/p/${item.code}/`,
      mediaUrls: [],
      author: {
        id: username,
        name: authorName,
        handle: username,
        avatarUrl,
        profileUrl: `https://www.instagram.com/${username}/`,
      },
      platformMetrics: {
        likes: item.like_count,
        comments: item.comment_count,
        lastUpdated: new Date(),
      },
      publishedAt: new Date(item.taken_at * 1000),
      tags: this.extractTags(caption),
      language: this.detectLanguage(caption),
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const user = await this.fetchUserProfile('instagram');
      return user !== null;
    } catch {
      return false;
    }
  }

  async getSourceInfo(username: string): Promise<SourceInfo | null> {
    try {
      const user = await this.fetchUserProfile(username);
      if (!user) return null;

      return {
        id: username,
        name: user.full_name || username,
        url: `https://www.instagram.com/${username}/`,
        subscriberCount: user.edge_followed_by?.count,
        avatarUrl: user.profile_pic_url_hd || user.profile_pic_url,
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
    const MAX_PAGES = 5;
    const items: RawContentItem[] = [];

    try {
      // --- Page 1: web_profile_info endpoint ---
      const user = await this.fetchUserProfile(username);
      if (!user) return items;

      const userId = user.id;
      const authorName = user.full_name || username;
      const avatarUrl = user.profile_pic_url_hd || user.profile_pic_url;

      const timeline = user.edge_owner_to_timeline_media;
      const edges = timeline?.edges || [];

      for (const edge of edges) {
        if (items.length >= maxItems) break;

        const node = edge.node;
        const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || '';

        let type: ContentType = 'image';
        if (node.is_video) {
          type = 'video';
        } else if (node.__typename === 'GraphSidecar') {
          type = 'image'; // carousel
        }

        items.push({
          platformId: node.shortcode,
          platform: 'instagram',
          type,
          title: caption.slice(0, 100) + (caption.length > 100 ? '...' : ''),
          description: caption,
          thumbnailUrl: node.display_url,
          contentUrl: `https://www.instagram.com/p/${node.shortcode}/`,
          mediaUrls: [],
          author: {
            id: username,
            name: authorName,
            handle: username,
            avatarUrl,
            profileUrl: `https://www.instagram.com/${username}/`,
          },
          platformMetrics: {
            likes: node.edge_liked_by?.count,
            comments: node.edge_media_to_comment?.count,
            lastUpdated: new Date(),
          },
          publishedAt: new Date(node.taken_at_timestamp * 1000),
          tags: this.extractTags(caption),
          language: this.detectLanguage(caption),
        });
      }

      // --- Pages 2+: feed/user endpoint with max_id pagination ---
      let hasNextPage = timeline?.page_info?.has_next_page ?? false;
      let nextCursor = timeline?.page_info?.end_cursor ?? null;
      let page = 1; // page 1 already fetched above

      while (items.length < maxItems && hasNextPage && nextCursor && page < MAX_PAGES) {
        page++;
        console.log(`[Instagram] Fetching page ${page} for @${username} (max_id: ${nextCursor})`);

        const feed = await this.fetchFeedPage(userId, nextCursor);
        if (!feed || !feed.items?.length) break;

        for (const feedItem of feed.items) {
          if (items.length >= maxItems) break;
          items.push(this.feedItemToRaw(feedItem, username, authorName, avatarUrl));
        }

        hasNextPage = feed.more_available ?? false;
        nextCursor = feed.next_max_id ?? null;
      }
    } catch (error) {
      console.error('[Instagram] Error fetching content:', error);
    }

    return items;
  }

  async searchContent(
    query: string,
    _options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    // Instagram search requires authentication — not available via this API
    console.warn('[Instagram] Search not supported without authentication');
    return [];
  }

  async close(): Promise<void> {
    // No browser to close
  }
}

export const instagramScraper = new InstagramScraper();
