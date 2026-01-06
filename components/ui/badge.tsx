import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-[var(--radius-sm)]',
          {
            'bg-[var(--color-primary)] text-white': variant === 'default',
            'bg-[var(--color-border-subtle)] text-[var(--color-secondary)]':
              variant === 'secondary',
            'bg-emerald-50 text-emerald-700': variant === 'success',
            'bg-amber-50 text-amber-700': variant === 'warning',
            'bg-red-50 text-red-700': variant === 'error',
            'bg-transparent border border-[var(--color-border)] text-[var(--color-muted)]':
              variant === 'outline',
          },
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
