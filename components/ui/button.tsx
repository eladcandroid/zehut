'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all',
          'disabled:opacity-50 disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
          {
            // Variants
            'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)] active:bg-[var(--color-primary-dark)]':
              variant === 'primary',
            'bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-background)] hover:border-[var(--color-muted)]':
              variant === 'secondary',
            'bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-border-subtle)]':
              variant === 'ghost',
            'bg-transparent text-[var(--color-primary)] border border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white':
              variant === 'outline',
            // Sizes
            'h-8 px-3 text-sm rounded-[var(--radius-md)]': size === 'sm',
            'h-10 px-4 text-sm rounded-[var(--radius-md)]': size === 'md',
            'h-12 px-6 text-base rounded-[var(--radius-lg)]': size === 'lg',
            'h-10 w-10 p-0 rounded-[var(--radius-md)]': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
