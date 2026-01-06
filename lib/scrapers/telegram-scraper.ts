import { Telegraf } from 'telegraf';
import {
  BaseScraper,
  type FetchOptions,
  type RawContentItem,
  type SourceInfo,
} from './base-scraper';
import type { Platform, ContentType } from '@/lib/db/models/content';

export class TelegramScraper extends BaseScraper {
  platform: Platform = 'telegram';
  name = 'Telegram Scraper';

  private bot: Telegraf | null = null;

  constructor() {
    super();
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    }
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.bot) return false;

    try {
      const me = await this.bot.telegram.getMe();
      return !!me.id;
    } catch (error) {
      console.error('[Telegram] Credentials validation failed:', error);
      return false;
    }
  }

  async getSourceInfo(channelUsername: string): Promise<SourceInfo | null> {
    if (!this.bot) return null;

    try {
      const chat = await this.bot.telegram.getChat(`@${channelUsername}`);

      if ('title' in chat) {
        return {
          id: chat.id.toString(),
          name: chat.title || channelUsername,
          url: `https://t.me/${channelUsername}`,
          subscriberCount: 'member_count' in chat ? (chat.member_count as number) : undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('[Telegram] Failed to get channel info:', error);
      return null;
    }
  }

  async fetchContent(
    channelUsername: string,
    options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    // Note: Telegram Bot API has limited access to channel history
    // For full channel history, you would need MTProto API
    // This implementation uses the bot's access which may be limited
    console.warn(
      '[Telegram] Bot API has limited access to channel history. ' +
        'For full history, consider using MTProto API.'
    );

    // Return empty for now - in production, you would implement:
    // 1. MTProto client for full history access
    // 2. Or set up webhook updates for new messages
    return [];
  }

  async searchContent(
    query: string,
    options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    // Telegram doesn't have a search API via Bot API
    // This would require MTProto or web scraping
    console.warn('[Telegram] Search not available via Bot API');
    return [];
  }

  // Helper method to transform a message if you set up webhook updates
  transformMessage(
    message: {
      message_id: number;
      chat: { id: number; username?: string; title?: string };
      text?: string;
      caption?: string;
      photo?: Array<{ file_id: string; width: number; height: number }>;
      video?: { file_id: string; duration: number; width: number; height: number };
      date: number;
      views?: number;
      forward_count?: number;
    },
    channelUsername: string
  ): RawContentItem {
    const text = message.text || message.caption || '';
    const hasPhoto = message.photo && message.photo.length > 0;
    const hasVideo = !!message.video;

    let type: ContentType = 'text';
    if (hasVideo) type = 'video';
    else if (hasPhoto) type = 'image';

    return {
      platformId: `${message.chat.id}_${message.message_id}`,
      platform: 'telegram',
      type,
      title: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
      description: text,
      thumbnailUrl: '', // Would need to download via bot.telegram.getFile()
      contentUrl: `https://t.me/${channelUsername}/${message.message_id}`,
      mediaUrls: [],
      author: {
        id: message.chat.id.toString(),
        name: message.chat.title || channelUsername,
        handle: channelUsername,
        profileUrl: `https://t.me/${channelUsername}`,
      },
      platformMetrics: {
        views: message.views,
        shares: message.forward_count,
        lastUpdated: new Date(),
      },
      publishedAt: new Date(message.date * 1000),
      tags: this.extractTags(text),
      language: this.detectLanguage(text),
    };
  }
}

export const telegramScraper = new TelegramScraper();
