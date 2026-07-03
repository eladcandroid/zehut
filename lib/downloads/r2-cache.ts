import { Readable } from 'node:stream';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';

const DEFAULT_BUCKET = 'zehut-downloads';

interface CachedObject {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number;
}

interface PutOptions {
  contentType: string;
  contentLength?: number;
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function getBucket(): string {
  return process.env.R2_BUCKET || DEFAULT_BUCKET;
}

function inferExt(quality: string): string {
  const q = quality.toLowerCase();
  if (q.includes('mp3') || q.includes('audio')) return 'mp3';
  return 'mp4';
}

function safeSlug(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80);
}

export function buildKey(
  platform: string,
  contentId: string | null,
  quality: string
): string {
  const id = contentId ? safeSlug(contentId) : `anon-${Date.now()}`;
  const q = safeSlug(quality || 'default');
  const ext = inferExt(quality);
  return `${platform}/${id}-${q}.${ext}`;
}

function bodyToWebStream(
  body: GetObjectCommandOutput['Body']
): ReadableStream<Uint8Array> | null {
  if (!body) return null;
  const maybeWeb = body as { transformToWebStream?: () => ReadableStream<Uint8Array> };
  if (typeof maybeWeb.transformToWebStream === 'function') {
    return maybeWeb.transformToWebStream();
  }
  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream<Uint8Array>;
  }
  return null;
}

export async function getCached(key: string): Promise<CachedObject | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const out = await client.send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key })
    );
    const stream = bodyToWebStream(out.Body);
    if (!stream) return null;
    return {
      stream,
      contentType: out.ContentType || 'application/octet-stream',
      contentLength: out.ContentLength ?? 0,
    };
  } catch (err) {
    const code = (err as { name?: string; Code?: string })?.name
      || (err as { Code?: string })?.Code;
    if (code === 'NoSuchKey' || code === 'NotFound') return null;
    console.error('[r2] getCached failed', err);
    return null;
  }
}

export function putBackground(
  key: string,
  stream: ReadableStream<Uint8Array>,
  opts: PutOptions
): void {
  const client = getClient();
  if (!client) {
    console.log('[r2] skip put (not configured)');
    return;
  }

  const upload = async () => {
    try {
      const body = Readable.fromWeb(stream as never);
      await client.send(
        new PutObjectCommand({
          Bucket: getBucket(),
          Key: key,
          Body: body,
          ContentType: opts.contentType,
          ContentLength: opts.contentLength,
        })
      );
    } catch (err) {
      console.error('[r2] putBackground failed', err);
    }
  };

  void upload();
}
