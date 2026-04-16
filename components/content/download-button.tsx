'use client';

import { useState, useEffect, useRef } from 'react';
import { DownloadSimple, CircleNotch, X, WhatsappLogo, FilmStrip, HighDefinition, Star, Check, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

const QUALITIES = [
  { id: 'whatsapp', label: 'WhatsApp', desc: '360p · קובץ קטן', icon: WhatsappLogo, color: 'text-green-500' },
  { id: '480', label: '480p', desc: 'איכות בינונית', icon: FilmStrip, color: 'text-sky-500' },
  { id: '720', label: '720p', desc: 'איכות גבוהה', icon: HighDefinition, color: 'text-blue-600' },
  { id: 'best', label: 'הכי טוב', desc: 'איכות מקסימלית', icon: Star, color: 'text-amber-500' },
] as const;

type DownloadState = 'idle' | 'processing' | 'downloading' | 'done' | 'error';

interface DownloadButtonProps {
  contentUrl: string;
  className?: string;
  directDownload?: boolean;
}

export function DownloadButton({ contentUrl, className, directDownload }: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>('idle');
  const [progress, setProgress] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
    setState('processing');
    setProgress(0);
    abortRef.current = new AbortController();

    try {
      let res: Response;

      if (directDownload) {
        // Direct audio download — stream through our API to bypass CORS
        res = await fetch(
          `/api/download?url=${encodeURIComponent(contentUrl)}&direct=1`,
          { signal: abortRef.current.signal },
        );
      } else {
        // Step 1: Get the proxy download URL from our API
        const apiRes = await fetch(
          `/api/download?url=${encodeURIComponent(contentUrl)}&quality=${quality}`,
          { signal: abortRef.current.signal },
        );
        if (!apiRes.ok) throw new Error('API error');
        const { downloadUrl } = await apiRes.json();

        // Step 2: Fetch from the proxy
        res = await fetch(downloadUrl, { signal: abortRef.current.signal });
      }

      if (!res.ok) {
        // Try to parse error JSON from proxy
        const ct = res.headers.get('Content-Type') || '';
        if (ct.includes('application/json')) {
          const body = await res.json();
          throw new Error(body?.error || 'Download failed');
        }
        throw new Error('Download failed');
      }

      const contentLength = Number(res.headers.get('Content-Length') || 0);
      const reader = res.body!.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      setState('downloading');

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength > 0) {
          setProgress(Math.round((received / contentLength) * 100));
        }
      }

      // Extract filename from Content-Disposition if available
      const disposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
      const defaultName = directDownload ? 'podcast.mp3' : 'video.mp4';
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : defaultName;

      const blob = new Blob(chunks as BlobPart[]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setState('idle');
        return;
      }
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    } finally {
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const isActive = state !== 'idle' && state !== 'done' && state !== 'error';

  return (
    <div className={className}>
      {/* Download button / progress indicator */}
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
      ) : state === 'done' ? (
        <span className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-green-600">
          <Check weight="bold" className="w-4 h-4" />
          <span>הושלם</span>
        </span>
      ) : state === 'error' ? (
        <span className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-red-500">
          <Warning weight="bold" className="w-4 h-4" />
          <span>נכשל</span>
        </span>
      ) : (
        <button
          onClick={handleCancel}
          className={cn(
            'relative inline-flex items-center justify-center gap-1.5 h-8 text-sm font-medium overflow-hidden',
            'rounded-[var(--radius-md)] transition-all',
            'bg-[var(--color-border-subtle)] text-[var(--color-secondary)]',
            state === 'processing' ? 'px-3' : 'px-3 min-w-[72px]',
          )}
          title="לחץ לביטול"
        >
          {/* Progress fill */}
          {state === 'downloading' && (
            <div
              className="absolute inset-y-0 start-0 bg-sky-500/15 transition-[width] duration-300 ease-linear"
              style={{ width: `${progress}%` }}
            />
          )}
          <span className="relative flex items-center gap-1.5">
            {state === 'processing' ? (
              <>
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                <span>מעבד...</span>
              </>
            ) : progress > 0 ? (
              <>
                <DownloadSimple weight="bold" className="w-4 h-4" />
                <span className="tabular-nums">{progress}%</span>
              </>
            ) : (
              <>
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                <span>מוריד...</span>
              </>
            )}
          </span>
        </button>
      )}

      {/* Backdrop */}
      {isOpen && !isActive && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in-0 duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
      {isOpen && !isActive && (
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
