'use client';

import { useState, useEffect, useRef } from 'react';
import {
  DownloadSimple,
  CircleNotch,
  X,
  WhatsappLogo,
  FilmStrip,
  HighDefinition,
  Star,
  Check,
  Warning,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import type { Platform } from '@/lib/db/models/content';

const QUALITIES = [
  { id: 'whatsapp', label: 'WhatsApp', desc: '360p · קובץ קטן', icon: WhatsappLogo, color: 'text-green-500' },
  { id: '480', label: '480p', desc: 'איכות בינונית', icon: FilmStrip, color: 'text-sky-500' },
  { id: '720', label: '720p', desc: 'איכות גבוהה', icon: HighDefinition, color: 'text-blue-600' },
  { id: 'best', label: 'הכי טוב', desc: 'איכות מקסימלית', icon: Star, color: 'text-amber-500' },
] as const;

type DownloadState = 'idle' | 'processing' | 'done' | 'error';

interface DownloadButtonProps {
  contentUrl: string;
  className?: string;
  platform?: Platform;
  contentId?: string;
  directDownload?: boolean;
  fallbackUrl?: string;
}

interface ResolveResponse {
  mode: 'direct' | 'proxy';
  downloadUrl: string;
  filename: string;
  contentType: string;
  tier: number;
  resolver: string;
}

export function DownloadButton({
  contentUrl,
  className,
  platform,
  contentId,
  directDownload,
  fallbackUrl,
}: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>('idle');
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 0);
  };

  const handleDownload = async (quality: string) => {
    setIsOpen(false);
    setState('processing');
    abortRef.current = new AbortController();

    try {
      const params = new URLSearchParams({ url: contentUrl, quality });
      if (platform) params.set('platform', platform);
      if (contentId) params.set('contentId', contentId);

      const apiRes = await fetch(`/api/download?${params.toString()}`, {
        signal: abortRef.current.signal,
      });

      if (!apiRes.ok) {
        const body = await apiRes.json().catch(() => ({}));
        throw new Error(body?.error || `API error ${apiRes.status}`);
      }

      const data = (await apiRes.json()) as ResolveResponse;
      triggerDownload(data.downloadUrl, data.filename);

      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setState('idle');
        return;
      }
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    } finally {
      abortRef.current = null;
    }
  };

  const openOnPlatform = () => {
    const url = fallbackUrl || contentUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
    setState('idle');
  };

  return (
    <div className={className}>
      {state === 'idle' ? (
        <button
          onClick={() => directDownload ? handleDownload('best') : setIsOpen(true)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-medium',
            'rounded-[var(--radius-md)] transition-all',
            'bg-[var(--color-border-subtle)] text-[var(--color-secondary)]',
            'hover:bg-[var(--color-border)] hover:text-[var(--color-foreground)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
          )}
        >
          <DownloadSimple weight="bold" className="w-4 h-4" />
          <span>הורד</span>
        </button>
      ) : state === 'processing' ? (
        <button
          disabled
          className={cn(
            'inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-medium',
            'rounded-[var(--radius-md)]',
            'bg-[var(--color-border-subtle)] text-[var(--color-secondary)]',
          )}
        >
          <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
          <span>מעבד...</span>
        </button>
      ) : state === 'done' ? (
        <span className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-green-600">
          <Check weight="bold" className="w-4 h-4" />
          <span>התחלת הורדה</span>
        </span>
      ) : (
        <button
          onClick={openOnPlatform}
          title="לא ניתן להוריד כעת. לחץ לפתיחה באתר המקור"
          className={cn(
            'inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-medium',
            'rounded-[var(--radius-md)] transition-all',
            'bg-red-500/10 text-red-600 hover:bg-red-500/15',
          )}
        >
          <Warning weight="bold" className="w-4 h-4" />
          <span>פתח במקור</span>
          <ArrowSquareOut weight="bold" className="w-3.5 h-3.5" />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in-0 duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

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
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
          </div>

          <div className="flex items-center justify-between px-4 pb-3 border-b border-[var(--color-border)]">
            <h3 className="text-base font-semibold">הורדה</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-[var(--color-border-subtle)] transition-colors"
            >
              <X weight="bold" className="w-5 h-5" />
            </button>
          </div>

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
