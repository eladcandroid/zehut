import type { Platform } from '@/lib/db/models/content';
import type { Resolver, ResolveInput, ResolveResult } from './types';

const SUPPORTED: Platform[] = ['youtube', 'instagram', 'facebook'];

interface RapidResponseLike {
  link?: string;
  url?: string;
  download_url?: string;
  title?: string;
  filename?: string;
  links?: Array<{ link?: string; url?: string; quality?: string }>;
  medias?: Array<{ url?: string; quality?: string; type?: string }>;
}

function hostForPlatform(platform: Platform): string | undefined {
  switch (platform) {
    case 'youtube':
      return process.env.RAPIDAPI_YOUTUBE_HOST;
    case 'instagram':
      return process.env.RAPIDAPI_INSTAGRAM_HOST;
    case 'facebook':
      return process.env.RAPIDAPI_FACEBOOK_HOST;
    default:
      return undefined;
  }
}

function buildEndpoint(host: string, input: ResolveInput): string {
  const encoded = encodeURIComponent(input.url);
  if (input.platform === 'youtube') {
    const idMatch = input.url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{6,})/);
    const id = idMatch?.[1];
    if (id) return `https://${host}/dl?id=${encodeURIComponent(id)}`;
    return `https://${host}/dl?url=${encoded}`;
  }
  return `https://${host}/?url=${encoded}`;
}

function pickMediaUrl(data: RapidResponseLike): string | null {
  if (data.link) return data.link;
  if (data.url) return data.url;
  if (data.download_url) return data.download_url;
  if (Array.isArray(data.links) && data.links.length > 0) {
    const first = data.links[0];
    return first.link || first.url || null;
  }
  if (Array.isArray(data.medias) && data.medias.length > 0) {
    return data.medias[0].url || null;
  }
  return null;
}

function pickFilename(data: RapidResponseLike, fallback: string): string {
  if (data.filename) return data.filename;
  if (data.title) {
    const safe = data.title.replace(/[^\w.\- ]+/g, '').trim().slice(0, 80);
    return safe ? `${safe}.mp4` : fallback;
  }
  return fallback;
}

function inferContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  return 'video/mp4';
}

export const rapidApiResolver: Resolver = {
  id: 'rapidapi',

  supports(platform: Platform): boolean {
    return SUPPORTED.includes(platform);
  },

  async resolve(input: ResolveInput): Promise<ResolveResult> {
    const key = process.env.RAPIDAPI_KEY;
    const host = hostForPlatform(input.platform);
    if (!key || !host) throw new Error('not configured');

    const endpoint = buildEndpoint(host, input);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`rapidapi http ${res.status}`);
    }

    const data = (await res.json()) as RapidResponseLike;
    const mediaUrl = pickMediaUrl(data);
    if (!mediaUrl) {
      throw new Error('rapidapi response missing media url');
    }

    const filename = pickFilename(data, `video-${Date.now()}.mp4`);

    return {
      mediaUrl,
      filename,
      contentType: inferContentType(filename),
      viaCorsCdn: true,
    };
  },
};
