import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import crypto from 'crypto';

const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'content');

// Ensure the images directory exists
if (!existsSync(IMAGES_DIR)) {
  mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Generate a unique filename from a URL
 */
function generateFilename(url: string, platform: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
  const timestamp = Date.now();

  // Try to extract extension from URL
  let ext = 'jpg';
  try {
    const urlPath = new URL(url).pathname;
    const match = urlPath.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
    if (match) {
      ext = match[1].toLowerCase();
    }
  } catch {
    // Use default extension
  }

  return `${platform}-${timestamp}-${hash}.${ext}`;
}

/**
 * Download an image from a URL and save it locally
 * Returns the local path (relative to public/) or null if download fails
 */
export async function downloadImage(
  imageUrl: string,
  platform: string
): Promise<string | null> {
  if (!imageUrl) return null;

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error(`[ImageDownloader] Failed to download ${imageUrl}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      console.error(`[ImageDownloader] Not an image: ${contentType}`);
      return null;
    }

    const filename = generateFilename(imageUrl, platform);
    const filepath = join(IMAGES_DIR, filename);

    // Convert response body to Node.js readable stream and save
    const body = response.body;
    if (!body) {
      console.error('[ImageDownloader] No response body');
      return null;
    }

    const writeStream = createWriteStream(filepath);
    await pipeline(Readable.fromWeb(body as never), writeStream);

    // Return the path relative to public/
    const localPath = `/images/content/${filename}`;
    console.log(`[ImageDownloader] Saved: ${localPath}`);
    return localPath;
  } catch (error) {
    console.error(`[ImageDownloader] Error downloading ${imageUrl}:`, error);
    return null;
  }
}

/**
 * Download an image with fallback - returns local path if successful, original URL otherwise
 */
export async function downloadImageWithFallback(
  imageUrl: string,
  platform: string
): Promise<string> {
  if (!imageUrl) return '';

  const localPath = await downloadImage(imageUrl, platform);
  return localPath || imageUrl;
}
