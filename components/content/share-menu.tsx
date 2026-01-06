'use client';

import {
  ShareNetwork,
  WhatsappLogo,
  TelegramLogo,
  FacebookLogo,
  XLogo,
  Copy,
  Check,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@/components/ui/dropdown';
import { useShare } from '@/lib/hooks/use-share';
import { cn } from '@/lib/utils/cn';

interface ShareMenuProps {
  contentId: string;
  title: string;
  shareCount?: number;
  className?: string;
}

export function ShareMenu({
  contentId,
  title,
  shareCount = 0,
  className,
}: ShareMenuProps) {
  const { share, copyLink, copied } = useShare({ contentId, title });

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {shareCount > 0 && (
        <span className="text-xs text-[var(--color-muted)] tabular-nums">
          {shareCount.toLocaleString('he-IL')} שיתופים
        </span>
      )}
      <Dropdown>
        <DropdownTrigger
          className={cn(
            'inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-medium',
            'rounded-[var(--radius-md)] transition-all',
            'bg-[var(--color-accent)] text-[var(--color-primary-dark)]',
            'hover:bg-[var(--color-accent-light)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2'
          )}
        >
          <ShareNetwork weight="bold" className="w-4 h-4" />
          <span>שתף</span>
        </DropdownTrigger>
        <DropdownContent align="end" className="w-48">
          <DropdownItem onClick={() => share('whatsapp')}>
            <WhatsappLogo weight="fill" className="w-4 h-4 text-green-500" />
            <span>WhatsApp</span>
          </DropdownItem>
          <DropdownItem onClick={() => share('telegram')}>
            <TelegramLogo weight="fill" className="w-4 h-4 text-sky-500" />
            <span>Telegram</span>
          </DropdownItem>
          <DropdownItem onClick={() => share('facebook')}>
            <FacebookLogo weight="fill" className="w-4 h-4 text-blue-600" />
            <span>Facebook</span>
          </DropdownItem>
          <DropdownItem onClick={() => share('x')}>
            <XLogo weight="fill" className="w-4 h-4" />
            <span>X</span>
          </DropdownItem>
          <DropdownItem onClick={copyLink}>
            {copied ? (
              <Check weight="bold" className="w-4 h-4 text-green-500" />
            ) : (
              <Copy weight="regular" className="w-4 h-4" />
            )}
            <span>{copied ? 'הועתק!' : 'העתק קישור'}</span>
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

interface ShareButtonProps {
  contentId: string;
  title: string;
  variant?: 'icon' | 'full';
  className?: string;
}

export function ShareButton({
  contentId,
  title,
  variant = 'icon',
  className,
}: ShareButtonProps) {
  const { share, copyLink, copied } = useShare({ contentId, title });

  if (variant === 'icon') {
    return (
      <Dropdown>
        <DropdownTrigger
          className={cn(
            'inline-flex items-center justify-center h-10 w-10 rounded-[var(--radius-md)]',
            'bg-transparent hover:bg-[var(--color-border-subtle)] transition-colors',
            className
          )}
        >
          <ShareNetwork weight="bold" className="w-5 h-5" />
          <span className="sr-only">שתף</span>
        </DropdownTrigger>
        <DropdownContent align="end" className="w-48">
          <DropdownItem onClick={() => share('whatsapp')}>
            <WhatsappLogo weight="fill" className="w-4 h-4 text-green-500" />
            <span>WhatsApp</span>
          </DropdownItem>
          <DropdownItem onClick={() => share('telegram')}>
            <TelegramLogo weight="fill" className="w-4 h-4 text-sky-500" />
            <span>Telegram</span>
          </DropdownItem>
          <DropdownItem onClick={() => share('facebook')}>
            <FacebookLogo weight="fill" className="w-4 h-4 text-blue-600" />
            <span>Facebook</span>
          </DropdownItem>
          <DropdownItem onClick={() => share('x')}>
            <XLogo weight="fill" className="w-4 h-4" />
            <span>X</span>
          </DropdownItem>
          <DropdownItem onClick={copyLink}>
            {copied ? (
              <Check weight="bold" className="w-4 h-4 text-green-500" />
            ) : (
              <Copy weight="regular" className="w-4 h-4" />
            )}
            <span>{copied ? 'הועתק!' : 'העתק קישור'}</span>
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    );
  }

  return <ShareMenu contentId={contentId} title={title} className={className} />;
}
