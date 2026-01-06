'use client';

import type { Platform } from '@/lib/db/models/content';
import { getPlatformIcon, getPlatformHebrewName } from '@/lib/utils/platform-icons';
import { cn } from '@/lib/utils/cn';

interface PlatformBadgeProps {
  platform: Platform;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const platformStyles: Record<Platform, string> = {
  youtube: 'bg-red-50 text-red-600 border-red-200',
  tiktok: 'bg-gray-50 text-gray-800 border-gray-200',
  instagram: 'bg-pink-50 text-pink-600 border-pink-200',
  telegram: 'bg-sky-50 text-sky-600 border-sky-200',
  x: 'bg-gray-50 text-gray-800 border-gray-200',
  facebook: 'bg-blue-50 text-blue-600 border-blue-200',
};

export function PlatformBadge({
  platform,
  showLabel = true,
  size = 'sm',
  className,
}: PlatformBadgeProps) {
  const Icon = getPlatformIcon(platform);

  if (!Icon) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-sm)] border font-medium',
        platformStyles[platform],
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        className
      )}
    >
      <Icon weight="fill" className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {showLabel && <span>{getPlatformHebrewName(platform)}</span>}
    </span>
  );
}
