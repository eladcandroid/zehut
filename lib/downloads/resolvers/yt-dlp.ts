import type { Platform } from '@/lib/db/models/content';
import type { Resolver, ResolveInput, ResolveResult } from './types';

const SUPPORTED: Platform[] = ['youtube', 'instagram', 'x', 'facebook'];

function deriveFilename(url: string): string {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    if (last && /\.(mp4|webm|mov|mkv)$/i.test(last)) return last;
    const id = parsed.searchParams.get('v') || last || 'video';
    return `video-${id}.mp4`;
  } catch {
    return 'video.mp4';
  }
}

export const ytDlpResolver: Resolver = {
  id: 'yt-dlp',

  supports(platform: Platform): boolean {
    return SUPPORTED.includes(platform);
  },

  async resolve(input: ResolveInput): Promise<ResolveResult> {
    const proxyUrl = process.env.YT_PROXY_URL || 'https://zehut-yt-proxy.fly.dev';
    const proxySecret = process.env.YT_PROXY_SECRET || '';
    if (!proxyUrl) throw new Error('not configured');

    const quality = input.quality || 'whatsapp';
    const params = new URLSearchParams({
      url: input.url,
      quality,
    });
    if (proxySecret) params.set('token', proxySecret);

    const mediaUrl = `${proxyUrl.replace(/\/+$/, '')}/download?${params.toString()}`;

    return {
      mediaUrl,
      filename: deriveFilename(input.url),
      contentType: 'video/mp4',
      viaCorsCdn: false,
      proxySecret: proxySecret || undefined,
    };
  },

  async healthCheck(): Promise<boolean> {
    const proxyUrl = process.env.YT_PROXY_URL || 'https://zehut-yt-proxy.fly.dev';
    if (!proxyUrl) return false;
    try {
      const res = await fetch(`${proxyUrl.replace(/\/+$/, '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
