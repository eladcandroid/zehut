import type { Platform } from '@/lib/db/models/content';
import type { Resolver, ResolveInput, ResolveResult } from './types';

function isDirectAudio(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.endsWith('.mp3') || lower.endsWith('.m4a') || lower.endsWith('.aac') || lower.endsWith('.ogg')) {
    return true;
  }
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('anchor.fm')) return true;
    if (host.includes('podcasts.spotify.com')) return true;
    if (host.includes('podtrac.com')) return true;
    if (host.includes('megaphone.fm')) return true;
    if (host.includes('cloudfront.net') && lower.includes('podcast')) return true;
  } catch {
    return false;
  }
  return false;
}

function filenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const base = parsed.pathname.split('/').filter(Boolean).pop();
    if (base) {
      const cleaned = base.split('?')[0];
      if (cleaned.includes('.')) return cleaned;
      return `${cleaned}.mp3`;
    }
  } catch {
    // ignore
  }
  return 'podcast.mp3';
}

export const spotifyRssResolver: Resolver = {
  id: 'spotify-rss',

  supports(platform: Platform): boolean {
    return platform === 'spotify';
  },

  async resolve(input: ResolveInput): Promise<ResolveResult> {
    if (!isDirectAudio(input.url)) {
      throw new Error('spotify-rss: not a direct audio url');
    }

    return {
      mediaUrl: input.url,
      filename: filenameFromUrl(input.url),
      contentType: 'audio/mpeg',
      viaCorsCdn: false,
    };
  },
};
