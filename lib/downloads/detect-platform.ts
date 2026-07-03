import type { Platform } from '@/lib/db/models/content';

const HOST_MAP: Array<{ patterns: string[]; platform: Platform }> = [
  { patterns: ['youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com'], platform: 'youtube' },
  { patterns: ['instagram.com', 'www.instagram.com'], platform: 'instagram' },
  { patterns: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com', 'mobile.twitter.com'], platform: 'x' },
  { patterns: ['facebook.com', 'www.facebook.com', 'fb.watch', 'm.facebook.com', 'web.facebook.com'], platform: 'facebook' },
  { patterns: ['open.spotify.com', 'spotify.com', 'www.spotify.com'], platform: 'spotify' },
  { patterns: ['t.me', 'telegram.me', 'telegram.org'], platform: 'telegram' },
];

export function detectPlatform(url: string): Platform | null {
  if (!url) return null;

  const trimmed = url.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let host: string;
  try {
    host = new URL(candidate).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (host.startsWith('www.')) {
    host = host.slice(4);
  }

  for (const entry of HOST_MAP) {
    for (const pattern of entry.patterns) {
      const normalized = pattern.startsWith('www.') ? pattern.slice(4) : pattern;
      if (host === normalized || host.endsWith(`.${normalized}`)) {
        return entry.platform;
      }
    }
  }

  return null;
}
