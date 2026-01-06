export { BaseScraper, type FetchOptions, type RawContentItem, type SourceInfo, type FetchResult } from './base-scraper';
export { YouTubeScraper, youtubeScraper } from './youtube-scraper';
export { TelegramScraper, telegramScraper } from './telegram-scraper';
export { XScraper, xScraper } from './x-scraper';
export { TikTokScraper, tiktokScraper } from './tiktok-scraper';
export { InstagramScraper, instagramScraper } from './instagram-scraper';

import { youtubeScraper } from './youtube-scraper';
import { telegramScraper } from './telegram-scraper';
import { xScraper } from './x-scraper';
import { tiktokScraper } from './tiktok-scraper';
import { instagramScraper } from './instagram-scraper';
import type { Platform } from '@/lib/db/models/content';
import type { BaseScraper } from './base-scraper';

export const scrapers: Record<Platform, BaseScraper> = {
  youtube: youtubeScraper,
  telegram: telegramScraper,
  x: xScraper,
  tiktok: tiktokScraper,
  instagram: instagramScraper,
};

export function getScraper(platform: Platform): BaseScraper {
  return scrapers[platform];
}
