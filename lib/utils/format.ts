import { formatDistanceToNow, format } from 'date-fns';
import { he } from 'date-fns/locale';

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: he });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'd בMMMM yyyy', { locale: he });
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString('he-IL');
}

export function formatViews(views: number): string {
  return `${formatNumber(views)} צפיות`;
}

export function formatLikes(likes: number): string {
  return `${formatNumber(likes)} לייקים`;
}

export function formatShares(shares: number): string {
  return `${formatNumber(shares)} שיתופים`;
}
