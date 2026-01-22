'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  FileText,
  ArrowsClockwise,
  type Icon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  href: string;
  icon: Icon;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/admin', icon: House, label: 'סקירה' },
  { href: '/admin/content', icon: FileText, label: 'תוכן' },
  { href: '/admin/jobs', icon: ArrowsClockwise, label: 'משימות' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="p-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-md)] transition-colors',
              isActive
                ? 'bg-[var(--color-accent)] text-[var(--color-primary-dark)] font-medium'
                : 'hover:bg-[var(--color-border-subtle)]'
            )}
          >
            <Icon weight="regular" className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
