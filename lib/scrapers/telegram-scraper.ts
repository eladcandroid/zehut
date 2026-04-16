import * as cheerio from 'cheerio';
import {
  BaseScraper,
  type FetchOptions,
  type RawContentItem,
  type SourceInfo,
} from './base-scraper';
import type { Platform, ContentType } from '@/lib/db/models/content';

// Telegram channel scraping via the public web preview at t.me/s/
// No bot token or browser required — works on Vercel serverless

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class TelegramScraper extends BaseScraper {
  platform: Platform = 'telegram';
  name = 'Telegram Scraper';

  private async fetchChannelPage(channelUsername: string): Promise<string> {
    const res = await fetch(`https://t.me/s/${channelUsername}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`Telegram returned ${res.status}`);
    return res.text();
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const html = await this.fetchChannelPage('telegram');
      return html.includes('tgme_page_title') || html.includes('tgme_widget_message');
    } catch {
      return false;
    }
  }

  async getSourceInfo(channelUsername: string): Promise<SourceInfo | null> {
    try {
      const html = await this.fetchChannelPage(channelUsername);
      const $ = cheerio.load(html);

      const name = $('.tgme_channel_info_header_title span').text().trim()
        || $('meta[property="og:title"]').attr('content')
        || channelUsername;
      const avatar = $('.tgme_page_photo_image img').attr('src')
        || $('.tgme_channel_info_header_photo img').attr('src')
        || '';
      const membersText = $('.tgme_channel_info_counter .counter_value').first().text().trim();
      const members = this.parseCount(membersText);

      return {
        id: channelUsername,
        name,
        url: `https://t.me/${channelUsername}`,
        subscriberCount: members || undefined,
        avatarUrl: avatar,
      };
    } catch (error) {
      console.error('[Telegram] Failed to get channel info:', error);
      return null;
    }
  }

  async fetchContent(
    channelUsername: string,
    options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    const { maxItems = 20 } = options;
    const items: RawContentItem[] = [];

    try {
      const html = await this.fetchChannelPage(channelUsername);
      const $ = cheerio.load(html);

      // Channel info for author
      const channelName = $('.tgme_channel_info_header_title span').text().trim()
        || $('meta[property="og:title"]').attr('content')
        || channelUsername;
      const channelAvatar = $('.tgme_page_photo_image img').attr('src')
        || $('.tgme_channel_info_header_photo img').attr('src')
        || '';

      // Parse messages
      $('.tgme_widget_message_wrap').each((_, el) => {
        if (items.length >= maxItems) return;

        const $msg = $(el);
        const msgEl = $msg.find('.tgme_widget_message');
        const msgId = msgEl.attr('data-post')?.split('/')[1] || '';

        if (!msgId) return;

        // Text content
        const textEl = $msg.find('.tgme_widget_message_text');
        const text = textEl.text().trim();

        // Skip service messages (channel created, photo updated, etc.)
        if ($msg.find('.service_message, .message_service').length > 0) return;
        if (!text && !$msg.find('.tgme_widget_message_photo_wrap, .tgme_widget_message_video_wrap, .tgme_widget_message_document_wrap').length) return;

        // Date
        const dateStr = $msg.find('.tgme_widget_message_date time').attr('datetime') || '';
        const publishedAt = dateStr ? new Date(dateStr) : new Date();

        // Views
        const viewsText = $msg.find('.tgme_widget_message_views').text().trim();
        const views = this.parseCount(viewsText);

        // Media detection
        const hasPhoto = $msg.find('.tgme_widget_message_photo_wrap').length > 0;
        const hasVideo = $msg.find('.tgme_widget_message_video_wrap, .tgme_widget_message_roundvideo').length > 0;

        let type: ContentType = 'text';
        let thumbnailUrl = '';

        if (hasVideo) {
          type = 'video';
          // Video poster/thumbnail from background-image style
          const videoWrap = $msg.find('.tgme_widget_message_video_thumb');
          const style = videoWrap.attr('style') || '';
          const bgMatch = style.match(/background-image:url\('([^']+)'\)/);
          if (bgMatch) thumbnailUrl = bgMatch[1];
        } else if (hasPhoto) {
          type = 'image';
          const photoWrap = $msg.find('.tgme_widget_message_photo_wrap');
          const style = photoWrap.attr('style') || '';
          const bgMatch = style.match(/background-image:url\('([^']+)'\)/);
          if (bgMatch) thumbnailUrl = bgMatch[1];
        }

        // Link preview image as fallback
        if (!thumbnailUrl) {
          const linkPreview = $msg.find('.link_preview_image');
          const style = linkPreview.attr('style') || '';
          const bgMatch = style.match(/background-image:url\('([^']+)'\)/);
          if (bgMatch) thumbnailUrl = bgMatch[1];
        }

        items.push({
          platformId: `${channelUsername}_${msgId}`,
          platform: 'telegram',
          type,
          title: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
          description: text,
          thumbnailUrl,
          contentUrl: `https://t.me/${channelUsername}/${msgId}`,
          mediaUrls: [],
          author: {
            id: channelUsername,
            name: channelName,
            handle: channelUsername,
            avatarUrl: channelAvatar,
            profileUrl: `https://t.me/${channelUsername}`,
          },
          platformMetrics: {
            views,
            lastUpdated: new Date(),
          },
          publishedAt,
          tags: this.extractTags(text),
          language: this.detectLanguage(text),
        });
      });
    } catch (error) {
      console.error('[Telegram] Error fetching content:', error);
    }

    return items;
  }

  async searchContent(
    _query: string,
    _options: FetchOptions = {}
  ): Promise<RawContentItem[]> {
    // Telegram doesn't support public search via web preview
    console.warn('[Telegram] Search not available via public web preview');
    return [];
  }

  private parseCount(text: string): number {
    if (!text) return 0;
    const num = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (text.includes('K')) return num * 1000;
    if (text.includes('M')) return num * 1000000;
    return num || 0;
  }

  async close(): Promise<void> {
    // No resources to clean up
  }
}

export const telegramScraper = new TelegramScraper();
