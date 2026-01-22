import type { Platform, ContentType, IAuthor, IPlatformMetrics } from '@/lib/db/models/content';
import { generateTags } from '@/lib/tagging/auto-tagger';
import { contentFilters, type ContentValidationResult } from '@/config/content-filters';

export type { ContentValidationResult };

export interface FetchProgress {
  fetched: number;
  total?: number;
  message?: string;
}

export interface FetchOptions {
  maxItems?: number;
  since?: Date;
  searchQuery?: string;
  onProgress?: (progress: FetchProgress) => void | Promise<void>;
}

export interface RawContentItem {
  platformId: string;
  platform: Platform;
  type: ContentType;
  title: string;
  description: string;
  thumbnailUrl: string;
  contentUrl: string;
  embedUrl?: string;
  mediaUrls?: string[];
  author: IAuthor;
  platformMetrics: IPlatformMetrics;
  publishedAt: Date;
  tags?: string[];
  language?: string;
}

export interface FetchResult {
  items: RawContentItem[];
  errors: string[];
  totalFetched: number;
  newItems: number;
}

export interface SourceInfo {
  id: string;
  name: string;
  url: string;
  subscriberCount?: number;
  avatarUrl?: string;
}

export abstract class BaseScraper {
  abstract platform: Platform;
  abstract name: string;

  abstract fetchContent(sourceId: string, options?: FetchOptions): Promise<RawContentItem[]>;

  abstract searchContent(query: string, options?: FetchOptions): Promise<RawContentItem[]>;

  abstract getSourceInfo(sourceId: string): Promise<SourceInfo | null>;

  abstract validateCredentials(): Promise<boolean>;

  protected normalizeText(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }

  protected extractTags(title: string, description?: string): string[] {
    return generateTags(title, description || '');
  }

  protected detectLanguage(text: string): string {
    // Simple Hebrew detection
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text) ? 'he' : 'en';
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected logFetch(result: FetchResult): void {
    console.log(`[${this.name}] Fetched ${result.totalFetched} items, ${result.newItems} new`);
    if (result.errors.length > 0) {
      console.error(`[${this.name}] Errors:`, result.errors);
    }
  }

  /**
   * Check if content is relevant based on whitelist, keywords, and Hebrew percentage
   * @param title - The content title
   * @param description - The content description
   * @param channelId - The channel/author ID
   * @returns ContentValidationResult with isRelevant boolean and optional reason
   */
  protected isRelevantContent(
    title: string,
    description: string,
    channelId: string
  ): ContentValidationResult {
    // 1. Whitelist check - trusted channels bypass all filters
    if (contentFilters.whitelistedChannels.includes(channelId)) {
      return { isRelevant: true };
    }

    // 2. Keyword check - at least one keyword must match in title OR description
    const fullText = `${title} ${description}`.toLowerCase();
    const hasKeyword = contentFilters.relevanceKeywords.some(
      (keyword) => fullText.includes(keyword.toLowerCase())
    );

    if (!hasKeyword) {
      return { isRelevant: false, reason: 'No relevant keywords found' };
    }

    // 3. Hebrew language check - only apply to titles longer than 10 characters
    const hebrewRegex = /[\u0590-\u05FF]/g;
    const hebrewChars = (title.match(hebrewRegex) || []).length;
    const titleLength = title.length;

    if (titleLength > 10) {
      const hebrewPercentage = hebrewChars / titleLength;

      if (hebrewPercentage < contentFilters.minHebrewPercentage) {
        return {
          isRelevant: false,
          reason: `Hebrew percentage too low: ${(hebrewPercentage * 100).toFixed(1)}%`,
        };
      }
    }

    return { isRelevant: true };
  }
}
