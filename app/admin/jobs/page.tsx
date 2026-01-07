'use client';

import { useState, useEffect } from 'react';
import {
  ArrowsClockwise,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/format';
import { PLATFORMS, platformConfig } from '@/lib/utils/platform-icons';
import type { Platform } from '@/lib/db/models/content';

interface FetchJob {
  _id: string;
  platform: string;
  sourceType: string;
  sourceId: string;
  sourceName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRun?: string;
  lastResult?: {
    itemsFetched: number;
    newItems: number;
    errors: string[];
    duration: number;
  };
  isEnabled: boolean;
}


const statusConfig = {
  pending: { icon: Clock, label: 'ממתין', variant: 'secondary' as const },
  running: { icon: ArrowsClockwise, label: 'רץ', variant: 'default' as const },
  completed: { icon: CheckCircle, label: 'הושלם', variant: 'success' as const },
  failed: { icon: XCircle, label: 'נכשל', variant: 'error' as const },
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<FetchJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newJob, setNewJob] = useState({
    platform: 'youtube',
    sourceType: 'search',
    sourceId: '',
    maxItems: 50,
  });

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/fetch');
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const runJob = async (job: FetchJob) => {
    try {
      await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: job.platform,
          sourceId: job.sourceType === 'search' ? undefined : job.sourceId,
          searchQuery: job.sourceType === 'search' ? job.sourceId : undefined,
          sourceType: job.sourceType,
        }),
      });
      await fetchJobs();
    } catch (error) {
      console.error('Failed to run job:', error);
    }
  };

  const addJob = async () => {
    if (!newJob.sourceId) return;

    try {
      setIsSubmitting(true);
      await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: newJob.platform,
          sourceId: newJob.sourceType === 'search' ? undefined : newJob.sourceId,
          searchQuery: newJob.sourceType === 'search' ? newJob.sourceId : undefined,
          sourceType: newJob.sourceType,
          maxItems: newJob.maxItems,
        }),
      });
      setNewJob({ platform: 'youtube', sourceType: 'search', sourceId: '', maxItems: 50 });
      setIsAdding(false);
      await fetchJobs();
    } catch (error) {
      console.error('Failed to add job:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">משימות משיכת תוכן</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            הגדרת וניטור משימות איסוף תוכן מהפלטפורמות
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchJobs} variant="secondary" disabled={isLoading}>
            <ArrowsClockwise
              weight="bold"
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span>רענן</span>
          </Button>
          <Button onClick={() => setIsAdding(true)}>
            <Plus weight="bold" className="w-4 h-4" />
            <span>הוסף משימה</span>
          </Button>
        </div>
      </div>

      {/* Add Job Form */}
      {isAdding && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="font-semibold">משימה חדשה</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">פלטפורמה</label>
                <select
                  value={newJob.platform}
                  onChange={(e) => setNewJob({ ...newJob, platform: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{platformConfig[p].name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">סוג מקור</label>
                <select
                  value={newJob.sourceType}
                  onChange={(e) => setNewJob({ ...newJob, sourceType: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm"
                >
                  <option value="search">חיפוש</option>
                  <option value="channel">ערוץ/משתמש</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {newJob.sourceType === 'search' ? 'מילות חיפוש' : 'מזהה ערוץ'}
                </label>
                <input
                  type="text"
                  value={newJob.sourceId}
                  onChange={(e) => setNewJob({ ...newJob, sourceId: e.target.value })}
                  placeholder={newJob.sourceType === 'search' ? 'זהות פייגלין' : 'UC...'}
                  className="w-full h-10 px-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">מספר פריטים (0 = ללא הגבלה)</label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={newJob.maxItems}
                  onChange={(e) => setNewJob({ ...newJob, maxItems: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 px-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addJob} disabled={!newJob.sourceId || isSubmitting}>
                {isSubmitting && <ArrowsClockwise weight="bold" className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'מריץ משימה...' : 'הפעל משימה'}
              </Button>
              <Button variant="ghost" onClick={() => setIsAdding(false)} disabled={isSubmitting}>
                ביטול
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  פלטפורמה
                </th>
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  מקור
                </th>
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  סטטוס
                </th>
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  תוצאות
                </th>
                <th className="text-start p-4 text-xs font-medium text-[var(--color-muted)]">
                  הרצה אחרונה
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
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--color-muted)]">
                    אין משימות עדיין. הוסף משימה חדשה כדי להתחיל לאסוף תוכן.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const platform = job.platform as Platform;
                  const Icon = platformConfig[platform]?.icon;
                  const status = statusConfig[job.status];
                  const StatusIcon = status.icon;

                  return (
                    <tr
                      key={job._id}
                      className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-background)]"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {Icon && <Icon weight="fill" className="w-5 h-5" />}
                          <span className="text-sm capitalize">{job.platform}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium">{job.sourceName || job.sourceId}</p>
                          <p className="text-xs text-[var(--color-muted)]">{job.sourceType}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon
                            weight="fill"
                            className={`w-3 h-3 ${job.status === 'running' ? 'animate-spin' : ''}`}
                          />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {job.lastResult ? (
                          <div className="text-xs">
                            <p>
                              {job.lastResult.itemsFetched} פריטים ({job.lastResult.newItems} חדשים)
                            </p>
                            <p className="text-[var(--color-muted)]">
                              {(job.lastResult.duration / 1000).toFixed(1)}s
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-muted)]">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {job.lastRun ? (
                          <span className="text-xs text-[var(--color-muted)]">
                            {formatRelativeTime(job.lastRun)}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-muted)]">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => runJob(job)}
                          disabled={job.status === 'running'}
                        >
                          <Play weight="fill" className="w-4 h-4" />
                          <span>הפעל</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
