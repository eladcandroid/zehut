'use client';

import { useState, useEffect } from 'react';
import { DownloadSimple, CircleNotch, X, WhatsappLogo, FilmStrip, HighDefinition, Star } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

const QUALITIES = [
  { id: 'whatsapp', label: 'WhatsApp', desc: '360p · קובץ קטן', icon: WhatsappLogo, color: 'text-green-500' },
  { id: '480', label: '480p', desc: 'איכות בינונית', icon: FilmStrip, color: 'text-sky-500' },
  { id: '720', label: '720p', desc: 'איכות גבוהה', icon: HighDefinition, color: 'text-blue-600' },
  { id: 'best', label: 'הכי טוב', desc: 'איכות מקסימלית', icon: Star, color: 'text-amber-500' },
] as const;

interface DownloadButtonProps {
  contentUrl: string;
  className?: string;
}

export function DownloadButton({ contentUrl, className }: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleDownload = async (quality: string) => {
    setIsOpen(false);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(contentUrl)}&quality=${quality}`);
      if (!res.ok) throw new Error('API error');
      const { downloadUrl, token } = await res.json();
      window.open(`${downloadUrl}&token=${token}`, '_blank');
    } catch {
      window.open(contentUrl, '_blank');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-medium',
          'rounded-[var(--radius-md)] transition-all',
          'bg-[var(--color-border-subtle)] text-[var(--color-secondary)]',
          'hover:bg-[var(--color-border)] hover:text-[var(--color-foreground)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
        )}
      >
        {isLoading ? (
          <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
        ) : (
          <DownloadSimple weight="bold" className="w-4 h-4" />
        )}
        <span>הורד</span>
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
            <h3 className="text-base font-semibold">הורדה</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-[var(--color-border-subtle)] transition-colors"
            >
              <X weight="bold" className="w-5 h-5" />
            </button>
          </div>

          {/* Quality Options */}
          <div className="p-4 grid grid-cols-4 gap-4">
            {QUALITIES.map((q) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.id}
                  onClick={() => handleDownload(q.id)}
                  className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-[var(--color-border-subtle)] transition-colors"
                >
                  <div className="w-14 h-14 flex items-center justify-center bg-[var(--color-background)] rounded-full">
                    <Icon weight="fill" className={cn('w-7 h-7', q.color)} />
                  </div>
                  <span className="text-xs text-[var(--color-muted)]">{q.label}</span>
                </button>
              );
            })}
          </div>

          {/* Info text */}
          <div className="px-4 pb-6 text-center">
            <p className="text-xs text-[var(--color-muted)]">
              ההורדה עשויה לקחת עד דקה
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
