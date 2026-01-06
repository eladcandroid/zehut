export type ShareTarget = 'whatsapp' | 'telegram' | 'facebook' | 'x' | 'copy' | 'native';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export function getContentUrl(contentId: string): string {
  return `${SITE_URL}/content/${contentId}`;
}

export function getWhatsAppShareUrl(url: string, text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function getTelegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function getFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function getXShareUrl(url: string, text: string): string {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function getShareUrl(
  target: ShareTarget,
  url: string,
  text: string
): string | null {
  switch (target) {
    case 'whatsapp':
      return getWhatsAppShareUrl(url, text);
    case 'telegram':
      return getTelegramShareUrl(url, text);
    case 'facebook':
      return getFacebookShareUrl(url);
    case 'x':
      return getXShareUrl(url, text);
    case 'copy':
    case 'native':
      return null;
    default:
      return null;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
