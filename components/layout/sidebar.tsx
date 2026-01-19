'use client';

import { X } from '@phosphor-icons/react';
import {
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  TelegramLogo,
  XLogo,
  FacebookLogo,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { Platform } from '@/lib/db/models/content';

export interface PopularTag {
  tag: string;
  count: number;
}

interface FilterOption {
  value: Platform | 'all';
  label: string;
  icon?: React.ReactNode;
}

const platformFilters: FilterOption[] = [
  { value: 'all', label: 'הכל' },
  {
    value: 'youtube',
    label: 'יוטיוב',
    icon: <YoutubeLogo weight="fill" className="w-4 h-4 text-red-500" />,
  },
  {
    value: 'facebook',
    label: 'פייסבוק',
    icon: <FacebookLogo weight="fill" className="w-4 h-4 text-blue-600" />,
  },
  {
    value: 'telegram',
    label: 'טלגרם',
    icon: <TelegramLogo weight="fill" className="w-4 h-4 text-sky-500" />,
  },
  {
    value: 'x',
    label: 'X',
    icon: <XLogo weight="fill" className="w-4 h-4" />,
  },
  {
    value: 'tiktok',
    label: 'טיקטוק',
    icon: <TiktokLogo weight="fill" className="w-4 h-4" />,
  },
  {
    value: 'instagram',
    label: 'אינסטגרם',
    icon: <InstagramLogo weight="fill" className="w-4 h-4 text-pink-500" />,
  },
];

interface SortOption {
  value: string;
  label: string;
}

const sortOptions: SortOption[] = [
  { value: 'newest', label: 'הכי חדש' },
  { value: 'popular', label: 'הכי נצפה' },
  { value: 'shares', label: 'הכי משותף' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlatform: Platform | 'all';
  onPlatformChange: (platform: Platform | 'all') => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  popularTags?: PopularTag[];
  className?: string;
}

export function Sidebar({
  isOpen,
  onClose,
  selectedPlatform,
  onPlatformChange,
  selectedSort,
  onSortChange,
  selectedTags = [],
  onTagsChange,
  popularTags = [],
  className,
}: SidebarProps) {
  const handleTagClick = (tag: string) => {
    if (!onTagsChange) return;

    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearTags = () => {
    onTagsChange?.([]);
  };
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 bottom-0 start-0 z-50 w-64 p-4',
          'bg-[var(--color-surface)] border-e border-[var(--color-border)]',
          'transition-transform duration-200',
          'lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:!translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
          className
        )}
      >
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <h2 className="font-semibold">סינון</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X weight="bold" className="w-5 h-5" />
          </Button>
        </div>

        {/* Platform Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[var(--color-muted)] mb-3">
            פלטפורמה
          </h3>
          <div className="space-y-1">
            {platformFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => onPlatformChange(filter.value)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-md)] transition-colors',
                  selectedPlatform === filter.value
                    ? 'bg-[var(--color-accent)] text-[var(--color-primary-dark)] font-medium'
                    : 'hover:bg-[var(--color-border-subtle)]'
                )}
              >
                {filter.icon}
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[var(--color-muted)] mb-3">
            מיון
          </h3>
          <div className="space-y-1">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-md)] transition-colors text-start',
                  selectedSort === option.value
                    ? 'bg-[var(--color-accent)] text-[var(--color-primary-dark)] font-medium'
                    : 'hover:bg-[var(--color-border-subtle)]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags Filter */}
        {popularTags.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--color-muted)]">
                תגיות
              </h3>
              {selectedTags.length > 0 && (
                <button
                  onClick={clearTags}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  נקה בחירה
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularTags.map(({ tag, count }) => (
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
                  <span className={cn(
                    'text-[10px]',
                    selectedTags.includes(tag) ? 'text-white/70' : 'text-[var(--color-muted)]'
                  )}>
                    ({count})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
