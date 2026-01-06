'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOrCreateVisitorId } from '@/lib/utils/visitor-id';

interface UseVisitorReturn {
  visitorId: string | null;
  isLoading: boolean;
  registerVisitor: () => Promise<void>;
}

export function useVisitor(): UseVisitorReturn {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = getOrCreateVisitorId();
    setVisitorId(id);
    setIsLoading(false);
  }, []);

  const registerVisitor = useCallback(async () => {
    if (!visitorId) return;

    try {
      await fetch('/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Failed to register visitor:', error);
    }
  }, [visitorId]);

  useEffect(() => {
    if (visitorId) {
      registerVisitor();
    }
  }, [visitorId, registerVisitor]);

  return { visitorId, isLoading, registerVisitor };
}
