'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Eye, Heart, Play } from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';
import { PlatformBadge } from './platform-badge';
import { ShareMenu } from './share-menu';
import { formatRelativeTime, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { Platform, ContentType } from '@/lib/db/models/content';

export interface ContentCardData {
  _id: string;
  platform: Platform;
  type: ContentType;
  title: string;
  description: string;
  thumbnailUrl: string;
  contentUrl: string;
  author: {
    name: string;
    handle: string;
    avatarUrl?: string;
  };
  platformMetrics: {
    views?: number;
    likes?: number;
  };
  shareCount: number;
  publishedAt: string;
}

interface ContentCardProps {
  content: ContentCardData;
  className?: string;
}

export function ContentCard({ content, className }: ContentCardProps) {
  const isVideo = content.type === 'video' || content.type === 'reel';

  return (
    <Card hoverable className={cn('flex flex-col h-full', className)}>
      {/* Thumbnail */}
      <Link
        href={content.contentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video overflow-hidden rounded-t-[var(--radius-lg)] bg-[var(--color-border-subtle)]"
      >
        {content.thumbnailUrl ? (
          <Image
            src={content.thumbnailUrl}
            alt={content.title}
            fill
            className="object-cover transition-transform hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play weight="fill" className="w-12 h-12 text-[var(--color-muted)]" />
          </div>
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
              <Play weight="fill" className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
          </div>
        )}
        <PlatformBadge
          platform={content.platform}
          showLabel={false}
          className="absolute top-2 start-2"
        />
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Author */}
        <div className="flex items-center gap-2 mb-2">
          {content.author.avatarUrl ? (
            <Image
              src={content.author.avatarUrl}
              alt={content.author.name}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[var(--color-border)] flex items-center justify-center">
              <span className="text-xs font-medium text-[var(--color-muted)]">
                {content.author.name.charAt(0)}
              </span>
            </div>
          )}
          <span className="text-sm text-[var(--color-secondary)] truncate">
            {content.author.name}
          </span>
          <span className="text-xs text-[var(--color-muted)] ms-auto">
            {formatRelativeTime(content.publishedAt)}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-[var(--color-foreground)] line-clamp-2 mb-2 leading-snug">
          <Link
            href={content.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            {content.title}
          </Link>
        </h3>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-xs text-[var(--color-muted)] mb-3">
          {content.platformMetrics.views !== undefined && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye weight="regular" className="w-3.5 h-3.5" />
              {formatNumber(content.platformMetrics.views)}
            </span>
          )}
          {content.platformMetrics.likes !== undefined && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Heart weight="regular" className="w-3.5 h-3.5" />
              {formatNumber(content.platformMetrics.likes)}
            </span>
          )}
        </div>

        {/* Share */}
        <div className="mt-auto pt-2">
          <ShareMenu
            contentId={content._id}
            title={content.title}
            shareCount={content.shareCount}
          />
        </div>
      </div>
    </Card>
  );
}
