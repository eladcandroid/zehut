'use client';

import { cn } from '@/lib/utils/cn';

export interface PopularTag {
  tag: string;
  count: number;
}

interface TagBadgesProps {
  tags: PopularTag[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

export function TagBadges({
  tags,
  selectedTags,
  onTagsChange,
  className,
}: TagBadgesProps) {
  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearTags = () => {
    onTagsChange([]);
  };

  if (tags.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {tags.map(({ tag, count }) => (
        <span
          key={tag}
          role="button"
          tabIndex={0}
          onClick={() => handleTagClick(tag)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTagClick(tag);
            }
          }}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--radius-sm)] transition-colors cursor-pointer',
            selectedTags.includes(tag)
              ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]'
              : 'bg-[var(--color-border-subtle)] text-[var(--color-secondary)] hover:bg-[var(--color-border)]'
          )}
        >
          <span>{tag}</span>
          <span
            className={cn(
              'text-[10px]',
              selectedTags.includes(tag)
                ? 'text-white/70'
                : 'text-[var(--color-muted)]'
            )}
          >
            ({count})
          </span>
        </span>
      ))}
      {selectedTags.length > 0 && (
        <button
          onClick={clearTags}
          className="text-xs text-[var(--color-primary)] hover:underline px-1"
        >
          נקה
        </button>
      )}
    </div>
  );
}
