'use client';

import { useCallback, useState } from 'react';
import { useVisitor } from './use-visitor';
import {
  type ShareTarget,
  getShareUrl,
  copyToClipboard,
} from '@/lib/utils/share-url';

interface UseShareProps {
  contentId: string;
  title: string;
  contentUrl: string;
}

interface UseShareReturn {
  share: (target: ShareTarget) => Promise<void>;
  copyLink: () => Promise<boolean>;
  isSharing: boolean;
  lastSharedTarget: ShareTarget | null;
  copied: boolean;
}

export function useShare({ contentId, title, contentUrl }: UseShareProps): UseShareReturn {
  const { visitorId } = useVisitor();
  const [isSharing, setIsSharing] = useState(false);
  const [lastSharedTarget, setLastSharedTarget] = useState<ShareTarget | null>(null);
  const [copied, setCopied] = useState(false);

  const trackShare = useCallback(
    async (target: ShareTarget) => {
      if (!visitorId) return;

      try {
        await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId,
            visitorId,
            shareTarget: target,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
          }),
        });
      } catch (error) {
        console.error('Failed to track share:', error);
      }
    },
    [contentId, visitorId]
  );

  const share = useCallback(
    async (target: ShareTarget) => {
      setIsSharing(true);
      const shareUrl = getShareUrl(target, contentUrl, title);

      await trackShare(target);

      if (shareUrl) {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }

      setLastSharedTarget(target);
      setIsSharing(false);
    },
    [contentUrl, title, trackShare]
  );

  const copyLink = useCallback(async () => {
    const success = await copyToClipboard(contentUrl);

    if (success) {
      await trackShare('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    return success;
  }, [contentUrl, trackShare]);

  return {
    share,
    copyLink,
    isSharing,
    lastSharedTarget,
    copied,
  };
}
