import type { Platform } from '@/lib/db/models/content';
import type { Resolver, ResolveInput, ResolveResult } from './types';

const SUPPORTED: Platform[] = ['youtube', 'instagram', 'x', 'facebook', 'spotify'];

interface CobaltSuccess {
  status: 'redirect' | 'tunnel' | 'stream';
  url: string;
  filename?: string;
}

interface CobaltError {
  status: 'error';
  error: { code: string; context?: unknown };
}

interface CobaltPicker {
  status: 'picker';
  picker: Array<{ url: string; filename?: string; type?: string }>;
}

type CobaltResponse = CobaltSuccess | CobaltError | CobaltPicker;

function mapQuality(quality: string | undefined): string {
  const q = (quality || 'whatsapp').toLowerCase();
  if (q === 'whatsapp') return '360';
  if (q === 'best' || q === 'max') return 'max';
  if (q === '360' || q === '480' || q === '720' || q === '1080' || q === '1440' || q === '2160') return q;
  return q;
}

function inferContentType(filename: string, downloadMode: 'auto' | 'audio'): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.opus')) return 'audio/opus';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  return downloadMode === 'audio' ? 'audio/mpeg' : 'video/mp4';
}

function fallbackFilename(url: string, downloadMode: 'auto' | 'audio'): string {
  try {
    const parsed = new URL(url);
    const base = parsed.pathname.split('/').filter(Boolean).pop();
    if (base) return base;
  } catch {
    // ignore
  }
  return downloadMode === 'audio' ? 'audio.mp3' : 'video.mp4';
}

export const cobaltResolver: Resolver = {
  id: 'cobalt',

  supports(platform: Platform): boolean {
    return SUPPORTED.includes(platform);
  },

  async resolve(input: ResolveInput): Promise<ResolveResult> {
    const cobaltUrl = process.env.COBALT_URL;
    const cobaltKey = process.env.COBALT_API_KEY;
    if (!cobaltUrl) throw new Error('not configured');

    const downloadMode: 'auto' | 'audio' = input.platform === 'spotify' ? 'audio' : 'auto';
    const videoQuality = mapQuality(input.quality);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (cobaltKey) headers.Authorization = `Api-Key ${cobaltKey}`;

    const body = JSON.stringify({
      url: input.url,
      videoQuality,
      downloadMode,
    });

    const res = await fetch(`${cobaltUrl.replace(/\/+$/, '')}/`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`cobalt http ${res.status}`);
    }

    const data = (await res.json()) as CobaltResponse;

    if (data.status === 'error') {
      throw new Error(`cobalt error: ${data.error.code}`);
    }

    let mediaUrl: string;
    let filename: string | undefined;
    let viaCorsCdn: boolean;

    if (data.status === 'picker') {
      const first = data.picker[0];
      if (!first) throw new Error('cobalt picker empty');
      mediaUrl = first.url;
      filename = first.filename;
      viaCorsCdn = true;
    } else {
      mediaUrl = data.url;
      filename = data.filename;
      viaCorsCdn = data.status === 'redirect' || data.status === 'tunnel';
    }

    const resolvedFilename = filename || fallbackFilename(mediaUrl, downloadMode);
    const contentType = inferContentType(resolvedFilename, downloadMode);

    return {
      mediaUrl,
      filename: resolvedFilename,
      contentType,
      viaCorsCdn,
    };
  },

  async healthCheck(): Promise<boolean> {
    const cobaltUrl = process.env.COBALT_URL;
    if (!cobaltUrl) return false;
    try {
      const res = await fetch(`${cobaltUrl.replace(/\/+$/, '')}/`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { cobalt?: unknown };
      return typeof data === 'object' && data !== null && 'cobalt' in data;
    } catch {
      return false;
    }
  },
};
