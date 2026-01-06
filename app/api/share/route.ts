import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Share, Content, Visitor, type ShareTarget } from '@/lib/db/models';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { contentId, visitorId, shareTarget, userAgent, referrer } = body;

    if (!contentId || !visitorId || !shareTarget) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create share event
    const share = new Share({
      contentId,
      visitorId,
      shareTarget: shareTarget as ShareTarget,
      userAgent: userAgent || '',
      referrer: referrer || '',
      timestamp: new Date(),
    });

    await share.save();

    // Update content share count
    await Content.findByIdAndUpdate(contentId, {
      $inc: { shareCount: 1 },
    });

    // Update visitor share count
    await Visitor.findOneAndUpdate(
      { visitorId },
      { $inc: { totalShares: 1 } }
    );

    return NextResponse.json({ success: true, shareId: share._id });
  } catch (error) {
    console.error('Error recording share:', error);
    return NextResponse.json(
      { error: 'Failed to record share' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');

    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID required' },
        { status: 400 }
      );
    }

    const shares = await Share.find({ contentId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    // Aggregate by platform
    const byPlatform = shares.reduce(
      (acc, share) => {
        acc[share.shareTarget] = (acc[share.shareTarget] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      total: shares.length,
      byPlatform,
      recent: shares.slice(0, 10),
    });
  } catch (error) {
    console.error('Error fetching shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shares' },
      { status: 500 }
    );
  }
}
