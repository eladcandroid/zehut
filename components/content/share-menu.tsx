'use client';

import { useState, useEffect } from 'react';
import {
  ShareNetwork,
  WhatsappLogo,
  TelegramLogo,
  FacebookLogo,
  XLogo,
  Copy,
  Check,
  X,
} from '@phosphor-icons/react';
import { useShare } from '@/lib/hooks/use-share';
import { cn } from '@/lib/utils/cn';

interface ShareMenuProps {
  contentId: string;
  title: string;
  contentUrl: string;
  shareCount?: number;
  className?: string;
}

export function ShareMenu({
  contentId,
  title,
  contentUrl,
  shareCount = 0,
  className,
}: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { share, copyLink, copied } = useShare({ contentId, title, contentUrl });

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleShare = async (target: 'whatsapp' | 'telegram' | 'facebook' | 'x') => {
    await share(target);
    setIsOpen(false);
  };

  const handleCopy = async () => {
    await copyLink();
    setTimeout(() => setIsOpen(false), 500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: contentUrl,
        });
        // Track the share after successful native share
        await share('native');
        setIsOpen(false);
      } catch (err) {
        // User cancelled or error - fall back to showing options
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  const openSheet = () => {
    // Try native share first on mobile
    if (typeof navigator.share === 'function' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      handleNativeShare();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {shareCount > 0 && (
        <span className="text-xs text-[var(--color-muted)] tabular-nums">
          {shareCount.toLocaleString('he-IL')} שיתופים
        </span>
      )}

      <button
        onClick={openSheet}
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
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in-0 duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-[9999]',
            'bg-[var(--color-surface)] rounded-t-2xl',
            'shadow-[0_-4px_20px_rgba(0,0,0,0.15)]',
            'animate-in slide-in-from-bottom duration-300',
            'pb-[env(safe-area-inset-bottom)]'
          )}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-[var(--color-border)]">
            <h3 className="text-base font-semibold">שיתוף</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-[var(--color-border-subtle)] transition-colors"
            >
              <X weight="bold" className="w-5 h-5" />
            </button>
          </div>

          {/* Share Options */}
          <div className="p-4 grid grid-cols-4 gap-4">
            <ShareOption
              icon={<WhatsappLogo weight="fill" className="w-7 h-7 text-green-500" />}
              label="WhatsApp"
              onClick={() => handleShare('whatsapp')}
            />
            <ShareOption
              icon={<TelegramLogo weight="fill" className="w-7 h-7 text-sky-500" />}
              label="Telegram"
              onClick={() => handleShare('telegram')}
            />
            <ShareOption
              icon={<FacebookLogo weight="fill" className="w-7 h-7 text-blue-600" />}
              label="Facebook"
              onClick={() => handleShare('facebook')}
            />
            <ShareOption
              icon={<XLogo weight="fill" className="w-7 h-7" />}
              label="X"
              onClick={() => handleShare('x')}
            />
          </div>

          {/* Copy Link Button */}
          <div className="px-4 pb-6">
            <button
              onClick={handleCopy}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-12',
                'bg-[var(--color-background)] border border-[var(--color-border)]',
                'rounded-[var(--radius-lg)] text-sm font-medium',
                'hover:bg-[var(--color-border-subtle)] transition-colors'
              )}
            >
              {copied ? (
                <>
                  <Check weight="bold" className="w-5 h-5 text-green-500" />
                  <span>הקישור הועתק!</span>
                </>
              ) : (
                <>
                  <Copy weight="regular" className="w-5 h-5" />
                  <span>העתק קישור</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareOption({
  icon,
  label,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-[var(--color-border-subtle)] transition-colors"
    >
      <div className="w-14 h-14 flex items-center justify-center bg-[var(--color-background)] rounded-full">
        {icon}
      </div>
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
    </button>
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
  if (variant === 'icon') {
    return <ShareMenu contentId={contentId} title={title} className={className} />;
  }

  return <ShareMenu contentId={contentId} title={title} className={className} />;
}
