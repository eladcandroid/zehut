'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { List } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-16 px-4 flex items-center gap-4',
        'bg-white text-[var(--color-foreground)]',
        'border-b border-[var(--color-border)]',
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden text-[var(--color-foreground)] hover:bg-[var(--color-border-subtle)]"
      >
        <List weight="bold" className="w-5 h-5" />
        <span className="sr-only">תפריט</span>
      </Button>

      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/zehut-logo.png"
          alt="זהות"
          width={80}
          height={52}
          className="object-contain"
          priority
        />
      </Link>

      <div className="flex-1" />

      <nav className="hidden md:flex items-center gap-1">
        <Link
          href="/"
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors',
            pathname === '/'
              ? 'bg-[var(--color-accent)] text-[var(--color-primary-dark)]'
              : 'hover:bg-[var(--color-border-subtle)]'
          )}
        >
          תוכן
        </Link>
        <Link
          href="/admin"
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors',
            pathname?.startsWith('/admin')
              ? 'bg-[var(--color-accent)] text-[var(--color-primary-dark)]'
              : 'hover:bg-[var(--color-border-subtle)]'
          )}
        >
          ניהול
        </Link>
      </nav>
    </header>
  );
}
