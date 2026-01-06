'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  ShareNetwork,
  Users,
  Eye,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  TelegramLogo,
  XLogo,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Stats {
  totalContent: number;
  totalShares: number;
  totalVisitors: number;
  totalViews: number;
  contentByPlatform: Record<string, number>;
}

const platformIcons: Record<string, typeof YoutubeLogo> = {
  youtube: YoutubeLogo,
  tiktok: TiktokLogo,
  instagram: InstagramLogo,
  telegram: TelegramLogo,
  x: XLogo,
};

const platformColors: Record<string, string> = {
  youtube: 'text-red-500',
  tiktok: 'text-gray-800',
  instagram: 'text-pink-500',
  telegram: 'text-sky-500',
  x: 'text-gray-800',
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      // For now, we'll calculate stats from the content API
      const response = await fetch('/api/content?limit=1000');
      const data = await response.json();

      const contentByPlatform: Record<string, number> = {};
      let totalViews = 0;
      let totalShares = 0;

      for (const item of data.content || []) {
        contentByPlatform[item.platform] = (contentByPlatform[item.platform] || 0) + 1;
        totalViews += item.viewCount || 0;
        totalShares += item.shareCount || 0;
      }

      setStats({
        totalContent: data.pagination?.total || 0,
        totalShares,
        totalVisitors: 0, // Would need a separate API endpoint
        totalViews,
        contentByPlatform,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const triggerFetch = async (platform: string, query: string) => {
    setIsFetching(true);
    try {
      await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          searchQuery: query,
          maxItems: 20,
        }),
      });
      // Refresh stats
      await fetchStats();
    } catch (error) {
      console.error('Failed to trigger fetch:', error);
    } finally {
      setIsFetching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin">
          <ArrowsClockwise className="w-8 h-8 text-[var(--color-muted)]" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">סקירה כללית</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          סטטיסטיקות ופעולות מהירות
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-blue-50 flex items-center justify-center">
                <FileText weight="fill" className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats?.totalContent?.toLocaleString('he-IL') || 0}
                </p>
                <p className="text-xs text-[var(--color-muted)]">פריטי תוכן</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-green-50 flex items-center justify-center">
                <ShareNetwork weight="fill" className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats?.totalShares?.toLocaleString('he-IL') || 0}
                </p>
                <p className="text-xs text-[var(--color-muted)]">שיתופים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-purple-50 flex items-center justify-center">
                <Eye weight="fill" className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats?.totalViews?.toLocaleString('he-IL') || 0}
                </p>
                <p className="text-xs text-[var(--color-muted)]">צפיות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-amber-50 flex items-center justify-center">
                <Users weight="fill" className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats?.totalVisitors?.toLocaleString('he-IL') || 0}
                </p>
                <p className="text-xs text-[var(--color-muted)]">מבקרים</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content by Platform */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">תוכן לפי פלטפורמה</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.contentByPlatform || {}).map(([platform, count]) => {
                const Icon = platformIcons[platform];
                const color = platformColors[platform];
                return (
                  <div key={platform} className="flex items-center gap-3">
                    {Icon && <Icon weight="fill" className={`w-5 h-5 ${color}`} />}
                    <span className="flex-1 text-sm capitalize">{platform}</span>
                    <span className="text-sm font-medium tabular-nums">
                      {count.toLocaleString('he-IL')}
                    </span>
                  </div>
                );
              })}
              {Object.keys(stats?.contentByPlatform || {}).length === 0 && (
                <p className="text-sm text-[var(--color-muted)]">אין תוכן עדיין</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">משיכת תוכן מהירה</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--color-muted)] mb-4">
              חפש תוכן חדש בפלטפורמות השונות
            </p>
            <div className="space-y-2">
              <Button
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => triggerFetch('youtube', 'זהות פייגלין')}
                disabled={isFetching}
              >
                <YoutubeLogo weight="fill" className="w-4 h-4 text-red-500" />
                <span>חפש ביוטיוב</span>
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => triggerFetch('x', 'זהות OR פייגלין')}
                disabled={isFetching}
              >
                <XLogo weight="fill" className="w-4 h-4" />
                <span>חפש ב-X</span>
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => triggerFetch('tiktok', 'זהות פייגלין')}
                disabled={isFetching}
              >
                <TiktokLogo weight="fill" className="w-4 h-4" />
                <span>חפש בטיקטוק</span>
              </Button>
            </div>
            {isFetching && (
              <p className="text-xs text-[var(--color-accent)] mt-3">
                מחפש תוכן חדש...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
