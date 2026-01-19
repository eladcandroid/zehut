import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Content, type Platform } from '@/lib/db/models';

export interface TagCount {
  tag: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const platform = searchParams.get('platform') as Platform | null;

    const matchStage: Record<string, unknown> = { isActive: true };

    if (platform) {
      matchStage.platform = platform;
    }

    // Aggregate to get popular tags with counts
    const tags = await Content.aggregate([
      { $match: matchStage },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          tag: '$_id',
          count: 1,
        },
      },
    ]);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
