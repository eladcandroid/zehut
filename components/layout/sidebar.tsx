'use client';

import { X } from '@phosphor-icons/react';
import {
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  TelegramLogo,
  XLogo,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { Platform } from '@/lib/db/models/content';

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
  className?: string;
}

export function Sidebar({
  isOpen,
  onClose,
  selectedPlatform,
  onPlatformChange,
  selectedSort,
  onSortChange,
  className,
}: SidebarProps) {
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
        <div>
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
      </aside>
    </>
  );
}
