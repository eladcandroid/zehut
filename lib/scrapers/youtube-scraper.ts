import { google, youtube_v3 } from 'googleapis';
import {
  BaseScraper,
  type FetchOptions,
  type RawContentItem,
  type SourceInfo,
} from './base-scraper';
import type { Platform } from '@/lib/db/models/content';

export class YouTubeScraper extends BaseScraper {
  platform: Platform = 'youtube';
  name = 'YouTube Scraper';

  private youtube: youtube_v3.Youtube;

  constructor() {
    super();
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await this.youtube.channels.list({
        part: ['id'],
        mine: false,
        id: ['UC_x5XG1OV2P6uZZ5FSM9Ttw'], // Google Developers channel
        maxResults: 1,
      });
      return !!response.data.items?.length;
    } catch (error) {
      console.error('[YouTube] Credentials validation failed:', error);
      return false;
    }
  }

  async getSourceInfo(channelId: string): Promise<SourceInfo | null> {
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId],
      });

      const channel = response.data.items?.[0];
      if (!channel) return null;

      return {
        id: channelId,
        name: channel.snippet?.title || '',
        url: `https://www.youtube.com/channel/${channelId}`,
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        avatarUrl: channel.snippet?.thumbnails?.default?.url || undefined,
      };
    } catch (error) {
      console.error('[YouTube] Failed to get channel info:', error);
      return null;
    }
  }

  async fetchContent(
    channelIdOrHandle: string,
    options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    const { maxItems = 500, since } = options;
    const items: RawContentItem[] = [];

    try {
      // First, get the uploads playlist ID
      // Support both channel IDs (UC...) and handles (@username)
      const isHandle = channelIdOrHandle.startsWith('@');
      const channelResponse = await this.youtube.channels.list({
        part: ['contentDetails', 'snippet'],
        ...(isHandle
          ? { forHandle: channelIdOrHandle.substring(1) }
          : { id: [channelIdOrHandle] }
        ),
      });

      const channel = channelResponse.data.items?.[0];
      const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
      const channelId = channel?.id || channelIdOrHandle;

      if (!uploadsPlaylistId) {
        console.error('[YouTube] Could not find uploads playlist for channel');
        return items;
      }

      // Fetch videos from the uploads playlist
      let pageToken: string | undefined;
      let fetched = 0;

      while (fetched < maxItems) {
        const playlistResponse = await this.youtube.playlistItems.list({
          part: ['snippet', 'contentDetails'],
          playlistId: uploadsPlaylistId,
          maxResults: Math.min(50, maxItems - fetched),
          pageToken,
        });

        const videoIds =
          playlistResponse.data.items
            ?.map((item) => item.contentDetails?.videoId)
            .filter(Boolean) || [];

        if (videoIds.length === 0) break;

        // Get detailed video info
        const videosResponse = await this.youtube.videos.list({
          part: ['snippet', 'statistics'],
          id: videoIds as string[],
        });

        for (const video of videosResponse.data.items || []) {
          const publishedAt = new Date(video.snippet?.publishedAt || '');

          if (since && publishedAt < since) continue;

          items.push(this.transformVideo(video, channelId));
        }

        fetched += videoIds.length;
        pageToken = playlistResponse.data.nextPageToken || undefined;

        if (!pageToken) break;

        await this.delay(100); // Rate limiting
      }
    } catch (error) {
      console.error('[YouTube] Error fetching content:', error);
    }

    return items;
  }

  async searchContent(
    query: string,
    options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    const { maxItems = 500, since } = options;
    const items: RawContentItem[] = [];

    try {
      let pageToken: string | undefined;
      let fetched = 0;

      while (fetched < maxItems) {
        const searchResponse = await this.youtube.search.list({
          part: ['snippet'],
          q: query,
          type: ['video'],
          maxResults: Math.min(50, maxItems - fetched),
          pageToken,
          publishedAfter: since?.toISOString(),
          relevanceLanguage: 'he',
        });

        const videoIds =
          searchResponse.data.items
            ?.map((item) => item.id?.videoId)
            .filter(Boolean) || [];

        if (videoIds.length === 0) break;

        // Get detailed video info
        const videosResponse = await this.youtube.videos.list({
          part: ['snippet', 'statistics'],
          id: videoIds as string[],
        });

        for (const video of videosResponse.data.items || []) {
          items.push(this.transformVideo(video, video.snippet?.channelId || ''));
        }

        fetched += videoIds.length;
        pageToken = searchResponse.data.nextPageToken || undefined;

        if (!pageToken) break;

        await this.delay(100);
      }
    } catch (error) {
      console.error('[YouTube] Error searching content:', error);
    }

    return items;
  }

  private transformVideo(
    video: youtube_v3.Schema$Video,
    channelId: string
  ): RawContentItem {
    const snippet = video.snippet!;
    const statistics = video.statistics || {};
    const videoId = video.id!;

    return {
      platformId: videoId,
      platform: 'youtube',
      type: 'video',
      title: this.normalizeText(snippet.title),
      description: this.normalizeText(snippet.description),
      thumbnailUrl:
        snippet.thumbnails?.maxres?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.default?.url ||
        '',
      contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      mediaUrls: [],
      author: {
        id: channelId,
        name: snippet.channelTitle || '',
        handle: channelId,
        profileUrl: `https://www.youtube.com/channel/${channelId}`,
      },
      platformMetrics: {
        views: parseInt(statistics.viewCount || '0'),
        likes: parseInt(statistics.likeCount || '0'),
        comments: parseInt(statistics.commentCount || '0'),
        lastUpdated: new Date(),
      },
      publishedAt: new Date(snippet.publishedAt || ''),
      tags: [
        ...this.extractTags(snippet.description || ''),
        ...(snippet.tags || []),
      ],
      language: this.detectLanguage(snippet.title || ''),
    };
  }
}

export const youtubeScraper = new YouTubeScraper();
