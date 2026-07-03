import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/connection';
import { DownloadEvent } from '@/lib/db/models/download-event';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_session')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const hoursParam = request.nextUrl.searchParams.get('hours');
  const windowHours = Math.min(168, Math.max(1, parseInt(hoursParam || '24', 10) || 24));
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  await connectDB();

  const overallAgg = await DownloadEvent.aggregate([
    { $match: { ts: { $gte: since } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        success: { $sum: { $cond: ['$success', 1, 0] } },
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
  ]);

  const byPlatformAgg = await DownloadEvent.aggregate([
    { $match: { ts: { $gte: since } } },
    {
      $group: {
        _id: { platform: '$platform', tier: '$tier', resolverId: '$resolverId' },
        total: { $sum: 1 },
        success: { $sum: { $cond: ['$success', 1, 0] } },
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
    { $sort: { '_id.platform': 1, '_id.tier': 1 } },
  ]);

  const recentFailures = await DownloadEvent
    .find({ ts: { $gte: since }, success: false })
    .sort({ ts: -1 })
    .limit(20)
    .lean();

  const overall = overallAgg[0] || { total: 0, success: 0, avgLatencyMs: 0 };
  const successRate = overall.total > 0 ? overall.success / overall.total : 1;

  return NextResponse.json({
    windowHours,
    since: since.toISOString(),
    overall: {
      total: overall.total,
      success: overall.success,
      failure: overall.total - overall.success,
      successRate,
      avgLatencyMs: Math.round(overall.avgLatencyMs || 0),
    },
    byTier: byPlatformAgg.map((g) => ({
      platform: g._id.platform,
      tier: g._id.tier,
      resolverId: g._id.resolverId,
      total: g.total,
      success: g.success,
      successRate: g.total > 0 ? g.success / g.total : 1,
      avgLatencyMs: Math.round(g.avgLatencyMs || 0),
    })),
    recentFailures: recentFailures.map((f) => ({
      ts: f.ts,
      platform: f.platform,
      tier: f.tier,
      resolverId: f.resolverId,
      latencyMs: f.latencyMs,
      error: f.error,
      contentId: f.contentId,
    })),
  });
}
