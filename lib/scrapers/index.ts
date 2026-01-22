export { BaseScraper, type FetchOptions, type FetchProgress, type RawContentItem, type SourceInfo, type FetchResult, type ContentValidationResult } from './base-scraper';
export { YouTubeScraper, youtubeScraper } from './youtube-scraper';
export { TelegramScraper, telegramScraper } from './telegram-scraper';
export { XScraper, xScraper } from './x-scraper';
export { TikTokScraper, tiktokScraper } from './tiktok-scraper';
export { InstagramScraper, instagramScraper } from './instagram-scraper';
export { FacebookScraper, facebookScraper } from './facebook-scraper';

import { youtubeScraper } from './youtube-scraper';
import { telegramScraper } from './telegram-scraper';
import { xScraper } from './x-scraper';
import { tiktokScraper } from './tiktok-scraper';
import { instagramScraper } from './instagram-scraper';
import { facebookScraper } from './facebook-scraper';
import type { Platform } from '@/lib/db/models/content';
import type { BaseScraper, ContentValidationResult } from './base-scraper';
import { contentFilters } from '@/config/content-filters';

export const scrapers: Record<Platform, BaseScraper> = {
  youtube: youtubeScraper,
  telegram: telegramScraper,
  x: xScraper,
  tiktok: tiktokScraper,
  instagram: instagramScraper,
  facebook: facebookScraper,
};

export function getScraper(platform: Platform): BaseScraper {
  return scrapers[platform];
}

/**
 * Check if content is relevant based on whitelist, keywords, and Hebrew percentage
 * @param title - The content title
 * @param description - The content description
 * @param channelId - The channel/author ID
 * @returns ContentValidationResult with isRelevant boolean and optional reason
 */
export function isRelevantContent(
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
