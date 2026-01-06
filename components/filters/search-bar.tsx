'use client';

import { useState, useCallback } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'חיפוש...',
  className,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div
      className={cn(
        'relative flex items-center',
        'h-10 px-3 rounded-[var(--radius-md)]',
        'bg-[var(--color-surface)] border transition-all',
        isFocused
          ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
          : 'border-[var(--color-border)]',
        className
      )}
    >
      <MagnifyingGlass
        weight="regular"
        className="w-4 h-4 text-[var(--color-muted)] shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          'flex-1 bg-transparent px-2 text-sm outline-none',
          'placeholder:text-[var(--color-faint)]'
        )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-border-subtle)] transition-colors"
        >
          <X weight="bold" className="w-3.5 h-3.5 text-[var(--color-muted)]" />
        </button>
      )}
    </div>
  );
}
