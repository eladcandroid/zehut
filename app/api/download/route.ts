import { NextRequest, NextResponse } from 'next/server';

const PROXY_URL = process.env.YT_PROXY_URL || 'https://zehut-yt-proxy.fly.dev';
const PROXY_SECRET = process.env.YT_PROXY_SECRET || '';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const quality = request.nextUrl.searchParams.get('quality') || 'whatsapp';
  const direct = request.nextUrl.searchParams.get('direct') === '1';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Direct proxy mode: stream the audio file through our API (bypasses CORS)
  if (direct) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch audio' }, { status: 502 });
      }

      const filename = url.split('/').pop()?.split('?')[0] || 'podcast.mp3';
      return new NextResponse(res.body, {
        headers: {
          'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
          'Content-Length': res.headers.get('Content-Length') || '',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
  }

  const downloadUrl = `${PROXY_URL}/download?url=${encodeURIComponent(url)}&quality=${quality}&token=${PROXY_SECRET}`;

  return NextResponse.json({ downloadUrl });
}
