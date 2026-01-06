'use client';

import { useState, useEffect } from 'react';
import {
  ArrowsClockwise,
  Trash,
  Eye,
  ShareNetwork,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlatformBadge } from '@/components/content/platform-badge';
import type { ContentCardData } from '@/components/content';
import { formatRelativeTime, formatNumber } from '@/lib/utils/format';

export default function AdminContentPage() {
  const [content, setContent] = useState<ContentCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchContent = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sort: 'newest',
      });

      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/content?${params}`);
      const data = await response.json();

      setContent(data.content);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [page, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התוכן הזה?')) return;

    try {
      await fetch(`/api/content/${id}`, { method: 'DELETE' });
      setContent((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error('Failed to delete content:', error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">ניהול תוכן</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            צפייה ועריכת כל התכנים במערכת
          </p>
        </div>
        <Button onClick={fetchContent} variant="secondary" disabled={isLoading}>
          <ArrowsClockwise
            weight="bold"
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
          />
          <span>רענן</span>
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="relative">
            <MagnifyingGlass
              weight="regular"
              className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="חפש תוכן..."
              className="w-full h-10 ps-10 pe-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  תוכן
                </th>
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  פלטפורמה
                </th>
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  צפיות
                </th>
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  שיתופים
                </th>
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  תאריך
                </th>
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--color-muted)]">
                    טוען...
                  </td>
                </tr>
              ) : content.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--color-muted)]">
                    לא נמצא תוכן
                  </td>
                </tr>
              ) : (
                content.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-background)]"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {item.thumbnailUrl && (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="w-16 h-10 object-cover rounded-[var(--radius-sm)]"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-xs">
                            {item.title}
                          </p>
                          <p className="text-xs text-[var(--color-muted)]">
                            {item.author.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <PlatformBadge platform={item.platform} size="sm" />
                    </td>
                    <td className="p-4">
                      <span className="text-sm tabular-nums flex items-center gap-1">
                        <Eye weight="regular" className="w-3.5 h-3.5" />
                        {formatNumber(item.platformMetrics.views || 0)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm tabular-nums flex items-center gap-1">
                        <ShareNetwork weight="regular" className="w-3.5 h-3.5" />
                        {formatNumber(item.shareCount)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-[var(--color-muted)]">
                        {formatRelativeTime(item.publishedAt)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(item.contentUrl, '_blank')}
                        >
                          <Eye weight="regular" className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item._id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash weight="regular" className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-[var(--color-border)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              הקודם
            </Button>
            <span className="text-sm text-[var(--color-muted)]">
              עמוד {page} מתוך {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              הבא
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
