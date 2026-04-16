import {
  BaseScraper,
  type FetchOptions,
  type RawContentItem,
  type SourceInfo,
} from './base-scraper';
import type { Platform, ContentType } from '@/lib/db/models/content';

// Instagram scraping via the unofficial i.instagram.com API
// No API key or browser required — works on Vercel serverless
// Returns up to 12 latest posts per request with full metadata

const IG_API_BASE = 'https://i.instagram.com/api/v1';
const IG_APP_ID = '936619743392459';
const IG_USER_AGENT =
  'Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)';

interface IGUser {
  username: string;
  full_name: string;
  profile_pic_url: string;
  profile_pic_url_hd?: string;
  edge_followed_by: { count: number };
  edge_owner_to_timeline_media: {
    count: number;
    edges: IGPostEdge[];
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
    const items: RawContentItem[] = [];

    try {
      const user = await this.fetchUserProfile(username);
      if (!user) return items;

      const authorName = user.full_name || username;
      const avatarUrl = user.profile_pic_url_hd || user.profile_pic_url;

      const edges = user.edge_owner_to_timeline_media?.edges || [];

      for (const edge of edges.slice(0, maxItems)) {
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
