import { NextRequest, NextResponse } from 'next/server';

const PROXY_URL = process.env.YT_PROXY_URL || 'https://zehut-yt-proxy.fly.dev';
const PROXY_SECRET = process.env.YT_PROXY_SECRET || '';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const quality = request.nextUrl.searchParams.get('quality') || 'whatsapp';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const downloadUrl = `${PROXY_URL}/download?url=${encodeURIComponent(url)}&quality=${quality}`;

  return NextResponse.json({
    downloadUrl,
    token: PROXY_SECRET,
  });
}
