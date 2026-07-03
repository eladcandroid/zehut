'use client';

import { useEffect, useState } from 'react';
import { ArrowsClockwise, CheckCircle, WarningCircle, Lightning } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface TierStat {
  platform: string;
  tier: number;
  resolverId: string;
  total: number;
  success: number;
  successRate: number;
  avgLatencyMs: number;
}

interface Failure {
  ts: string;
  platform: string;
  tier: number;
  resolverId: string;
  latencyMs: number;
  error: string;
  contentId: string | null;
}

interface StatsResponse {
  windowHours: number;
  since: string;
  overall: {
    total: number;
    success: number;
    failure: number;
    successRate: number;
    avgLatencyMs: number;
  };
  byTier: TierStat[];
  recentFailures: Failure[];
}

const HOURS_OPTIONS = [
  { value: 1, label: 'שעה אחרונה' },
  { value: 24, label: '24 שעות' },
  { value: 168, label: '7 ימים' },
];

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtMs(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${n}ms`;
}

export default function AdminDownloadsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [windowHours, setWindowHours] = useState(24);
  const [loading, setLoading] = useState(true);

  const fetchStats = async (hours: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/downloads/stats?hours=${hours}`);
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error('Failed to fetch download stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(windowHours); }, [windowHours]);

  const grouped = new Map<string, TierStat[]>();
  for (const t of stats?.byTier || []) {
    const arr = grouped.get(t.platform) || [];
    arr.push(t);
    grouped.set(t.platform, arr);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">הורדות</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            הצלחת ההורדות לפי פלטפורמה ו-tier
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={windowHours}
            onChange={(e) => setWindowHours(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            {HOURS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => fetchStats(windowHours)}
            className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-border-subtle)]"
            title="רענון"
          >
            <ArrowsClockwise weight="bold" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overall */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-semibold tabular-nums">{stats?.overall.total ?? 0}</p>
            <p className="text-xs text-[var(--color-muted)]">סה״כ ניסיונות</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle weight="fill" className="w-5 h-5 text-green-500" />
              <p className="text-2xl font-semibold tabular-nums">{fmtPct(stats?.overall.successRate ?? 1)}</p>
            </div>
            <p className="text-xs text-[var(--color-muted)]">הצלחה</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <WarningCircle weight="fill" className="w-5 h-5 text-red-500" />
              <p className="text-2xl font-semibold tabular-nums">{stats?.overall.failure ?? 0}</p>
            </div>
            <p className="text-xs text-[var(--color-muted)]">כשלונות</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Lightning weight="fill" className="w-5 h-5 text-amber-500" />
              <p className="text-2xl font-semibold tabular-nums">{fmtMs(stats?.overall.avgLatencyMs ?? 0)}</p>
            </div>
            <p className="text-xs text-[var(--color-muted)]">השהיה ממוצעת</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-platform per-tier */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-semibold">פירוט לפי פלטפורמה ו-tier</h2>
        </CardHeader>
        <CardContent>
          {grouped.size === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">אין נתונים בטווח הזמן שנבחר</p>
          ) : (
            <div className="space-y-4">
              {Array.from(grouped.entries()).map(([platform, tiers]) => (
                <div key={platform}>
                  <h3 className="text-sm font-medium mb-2 capitalize">{platform}</h3>
                  <div className="grid grid-cols-12 gap-2 text-xs text-[var(--color-muted)] mb-1 px-2">
                    <div className="col-span-1">Tier</div>
                    <div className="col-span-4">Resolver</div>
                    <div className="col-span-2 text-end">סה״כ</div>
                    <div className="col-span-2 text-end">הצלחה</div>
                    <div className="col-span-3 text-end">השהיה</div>
                  </div>
                  {tiers.map((t) => (
                    <div key={`${t.platform}-${t.tier}-${t.resolverId}`} className="grid grid-cols-12 gap-2 text-sm py-2 px-2 rounded-[var(--radius-md)] hover:bg-[var(--color-border-subtle)]">
                      <div className="col-span-1 tabular-nums">T{t.tier}</div>
                      <div className="col-span-4 font-mono text-xs">{t.resolverId}</div>
                      <div className="col-span-2 text-end tabular-nums">{t.total}</div>
                      <div className={`col-span-2 text-end tabular-nums font-medium ${t.successRate >= 0.95 ? 'text-green-600' : t.successRate >= 0.8 ? 'text-amber-600' : 'text-red-600'}`}>
                        {fmtPct(t.successRate)}
                      </div>
                      <div className="col-span-3 text-end tabular-nums">{fmtMs(t.avgLatencyMs)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent failures */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">כשלונות אחרונים</h2>
        </CardHeader>
        <CardContent>
          {!stats?.recentFailures?.length ? (
            <p className="text-sm text-[var(--color-muted)]">אין כשלונות אחרונים</p>
          ) : (
            <div className="space-y-1 text-sm">
              {stats.recentFailures.map((f, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 py-1.5 border-b border-[var(--color-border-subtle)] last:border-b-0">
                  <div className="col-span-2 text-xs text-[var(--color-muted)]">{new Date(f.ts).toLocaleTimeString('he-IL')}</div>
                  <div className="col-span-2 capitalize">{f.platform}</div>
                  <div className="col-span-2 font-mono text-xs">{f.resolverId} (T{f.tier})</div>
                  <div className="col-span-6 text-xs text-red-600 truncate" title={f.error}>{f.error}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
