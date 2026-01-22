'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartBar } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

export function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 h-14 px-4 flex items-center gap-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <Link href="/admin" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center">
          <ChartBar weight="fill" className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-semibold">ניהול</span>
      </Link>

      <div className="flex-1" />

      <Link
        href="/"
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors',
          pathname === '/'
            ? 'bg-[var(--color-accent)] text-[var(--color-primary-dark)]'
            : 'hover:bg-[var(--color-border-subtle)]'
        )}
      >
        חזרה לאתר
      </Link>
    </header>
  );
}
