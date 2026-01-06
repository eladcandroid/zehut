import type { Platform, ContentType, IAuthor, IPlatformMetrics } from '@/lib/db/models/content';

export interface FetchOptions {
  maxItems?: number;
  since?: Date;
  searchQuery?: string;
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

  protected extractTags(text: string): string[] {
    const hashtagRegex = /#[\u0590-\u05FFa-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map((tag) => tag.slice(1)) : [];
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
}
