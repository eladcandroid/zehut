import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src');
  const name = request.nextUrl.searchParams.get('name') || 'download';
  const ct = request.nextUrl.searchParams.get('ct') || 'application/octet-stream';

  if (!src) {
    return NextResponse.json({ error: 'Missing src parameter' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(src, { redirect: 'follow' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'upstream fetch failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `upstream returned ${upstream.status}` },
      { status: 502 }
    );
  }

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || ct);
  const cl = upstream.headers.get('Content-Length');
  if (cl) headers.set('Content-Length', cl);
  headers.set('Content-Disposition', buildContentDisposition(name));
  headers.set('Cache-Control', 'private, no-store');

  return new Response(upstream.body, { status: 200, headers });
}

function buildContentDisposition(name: string): string {
  const safeAscii = name.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  const utf8 = encodeURIComponent(name);
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${utf8}`;
}
