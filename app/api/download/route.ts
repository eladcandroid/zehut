import { NextRequest, NextResponse } from 'next/server';
import { detectPlatform } from '@/lib/downloads/detect-platform';
import { resolveDownload, DownloadResolveError } from '@/lib/downloads/router';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const quality = request.nextUrl.searchParams.get('quality') || 'best';
  const contentId = request.nextUrl.searchParams.get('contentId');
  const explicitPlatform = request.nextUrl.searchParams.get('platform');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const platform = explicitPlatform || detectPlatform(url);
  if (!platform) {
    return NextResponse.json(
      { error: 'Unsupported platform for this URL' },
      { status: 400 }
    );
  }

  try {
    const resolved = await resolveDownload({
      url,
      quality,
      platform: platform as ReturnType<typeof detectPlatform> extends infer P ? NonNullable<P> : never,
      contentId,
    });

    if (resolved.viaCorsCdn) {
      return NextResponse.json({
        mode: 'direct',
        downloadUrl: resolved.mediaUrl,
        filename: resolved.filename,
        contentType: resolved.contentType,
        tier: resolved.tier,
        resolver: resolved.resolverId,
      });
    }

    const streamUrl = new URL('/api/download/stream', request.nextUrl.origin);
    streamUrl.searchParams.set('src', resolved.mediaUrl);
    streamUrl.searchParams.set('name', resolved.filename);
    streamUrl.searchParams.set('ct', resolved.contentType);
    if (contentId) streamUrl.searchParams.set('contentId', contentId);

    return NextResponse.json({
      mode: 'proxy',
      downloadUrl: streamUrl.pathname + streamUrl.search,
      filename: resolved.filename,
      contentType: resolved.contentType,
      tier: resolved.tier,
      resolver: resolved.resolverId,
    });
  } catch (err) {
    if (err instanceof DownloadResolveError) {
      return NextResponse.json(
        { error: err.message, attempts: err.attempts },
        { status: 502 }
      );
    }
    const message = err instanceof Error ? err.message : 'Download resolution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
