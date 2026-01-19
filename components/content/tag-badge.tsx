'use client';

import { cn } from '@/lib/utils/cn';

interface TagBadgeProps {
  tag: string;
  selected?: boolean;
  onClick?: (tag: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function TagBadge({
  tag,
  selected = false,
  onClick,
  size = 'sm',
  className,
}: TagBadgeProps) {
  const isClickable = !!onClick;

  return (
    <span
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={() => onClick?.(tag)}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.(tag);
        }
      }}
      className={cn(
        'inline-flex items-center rounded-[var(--radius-sm)] transition-colors',
        size === 'sm' && 'px-1.5 py-0.5 text-[10px]',
        size === 'md' && 'px-2 py-1 text-xs',
        selected
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--color-border-subtle)] text-[var(--color-secondary)]',
        isClickable && !selected && 'hover:bg-[var(--color-border)] cursor-pointer',
        isClickable && selected && 'hover:bg-[var(--color-primary-dark)] cursor-pointer',
        className
      )}
    >
      {tag}
    </span>
  );
}

interface TagListProps {
  tags: string[];
  maxDisplay?: number;
  selectedTags?: string[];
  onTagClick?: (tag: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function TagList({
  tags,
  maxDisplay = 3,
  selectedTags = [],
  onTagClick,
  size = 'sm',
  className,
}: TagListProps) {
  if (!tags || tags.length === 0) return null;

  const displayTags = tags.slice(0, maxDisplay);
  const remaining = tags.length - maxDisplay;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {displayTags.map((tag) => (
        <TagBadge
          key={tag}
          tag={tag}
          selected={selectedTags.includes(tag)}
          onClick={onTagClick}
          size={size}
        />
      ))}
      {remaining > 0 && (
        <span className={cn(
          'text-[var(--color-muted)]',
          size === 'sm' && 'text-[10px]',
          size === 'md' && 'text-xs'
        )}>
          +{remaining}
        </span>
      )}
    </div>
  );
}
