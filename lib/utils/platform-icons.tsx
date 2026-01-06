import {
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  TelegramLogo,
  XLogo,
  FacebookLogo,
} from '@phosphor-icons/react';
import type { Platform } from '@/lib/db/models/content';

// Single source of truth for all platforms
export const PLATFORMS: Platform[] = ['youtube', 'facebook', 'telegram', 'x', 'tiktok', 'instagram'];

export const platformConfig: Record<Platform, { icon: typeof YoutubeLogo; name: string; hebrewName: string; color: string }> = {
  youtube: { icon: YoutubeLogo, name: 'YouTube', hebrewName: 'יוטיוב', color: 'var(--color-youtube)' },
  facebook: { icon: FacebookLogo, name: 'Facebook', hebrewName: 'פייסבוק', color: 'var(--color-facebook)' },
  telegram: { icon: TelegramLogo, name: 'Telegram', hebrewName: 'טלגרם', color: 'var(--color-telegram)' },
  x: { icon: XLogo, name: 'X', hebrewName: 'X', color: 'var(--color-x)' },
  tiktok: { icon: TiktokLogo, name: 'TikTok', hebrewName: 'טיקטוק', color: 'var(--color-tiktok)' },
  instagram: { icon: InstagramLogo, name: 'Instagram', hebrewName: 'אינסטגרם', color: 'var(--color-instagram)' },
};

export function getPlatformIcon(platform: Platform) {
  return platformConfig[platform]?.icon ?? null;
}

export function getPlatformColor(platform: Platform): string {
  return platformConfig[platform]?.color ?? 'var(--color-muted)';
}

export function getPlatformName(platform: Platform): string {
  return platformConfig[platform]?.name ?? platform;
}

export function getPlatformHebrewName(platform: Platform): string {
  return platformConfig[platform]?.hebrewName ?? platform;
}
