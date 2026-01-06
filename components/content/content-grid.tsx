'use client';

import { ContentCard, type ContentCardData } from './content-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

interface ContentGridProps {
  content: ContentCardData[];
  isLoading?: boolean;
  className?: string;
}

export function ContentGrid({ content, isLoading, className }: ContentGridProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
          className
        )}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <ContentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[var(--color-muted)] text-lg mb-2">לא נמצא תוכן</p>
        <p className="text-[var(--color-faint)] text-sm">
          נסה לשנות את הסינון או לחזור מאוחר יותר
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {content.map((item) => (
        <ContentCard key={item._id} content={item} />
      ))}
    </div>
  );
}

function ContentCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-3/4 mb-3" />
        <div className="flex items-center gap-4 mb-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
