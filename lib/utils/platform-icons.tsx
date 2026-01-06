import {
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  TelegramLogo,
  XLogo,
} from '@phosphor-icons/react';
import type { Platform } from '@/lib/db/models/content';

export function getPlatformIcon(platform: Platform) {
  switch (platform) {
    case 'youtube':
      return YoutubeLogo;
    case 'tiktok':
      return TiktokLogo;
    case 'instagram':
      return InstagramLogo;
    case 'telegram':
      return TelegramLogo;
    case 'x':
      return XLogo;
    default:
      return null;
  }
}

export function getPlatformColor(platform: Platform): string {
  switch (platform) {
    case 'youtube':
      return 'var(--color-youtube)';
    case 'tiktok':
      return 'var(--color-tiktok)';
    case 'instagram':
      return 'var(--color-instagram)';
    case 'telegram':
      return 'var(--color-telegram)';
    case 'x':
      return 'var(--color-x)';
    default:
      return 'var(--color-muted)';
  }
}

export function getPlatformName(platform: Platform): string {
  switch (platform) {
    case 'youtube':
      return 'YouTube';
    case 'tiktok':
      return 'TikTok';
    case 'instagram':
      return 'Instagram';
    case 'telegram':
      return 'Telegram';
    case 'x':
      return 'X';
    default:
      return platform;
  }
}

export function getPlatformHebrewName(platform: Platform): string {
  switch (platform) {
    case 'youtube':
      return 'יוטיוב';
    case 'tiktok':
      return 'טיקטוק';
    case 'instagram':
      return 'אינסטגרם';
    case 'telegram':
      return 'טלגרם';
    case 'x':
      return 'X';
    default:
      return platform;
  }
}
