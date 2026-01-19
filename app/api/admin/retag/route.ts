import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Content, type Platform } from '@/lib/db/models';
import { generateTags } from '@/lib/tagging/auto-tagger';

const BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const platform = body.platform as Platform | undefined;
    const limit = body.limit || 1000;

    // Build query
    const query: Record<string, unknown> = {};
    if (platform) {
      query.platform = platform;
    }

    // Get total count
    const totalCount = await Content.countDocuments(query);
    const toProcess = Math.min(totalCount, limit);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    // Process in batches to avoid memory issues
    while (processed < toProcess) {
      const batch = await Content.find(query)
        .skip(processed)
        .limit(BATCH_SIZE)
        .lean();

      if (batch.length === 0) break;

      const bulkOps = batch.map((doc) => {
        try {
          const newTags = generateTags(doc.title || '', doc.description || '');
          return {
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { tags: newTags } },
            },
          };
        } catch {
          errors++;
          return null;
        }
      }).filter(Boolean);

      if (bulkOps.length > 0) {
        const result = await Content.bulkWrite(bulkOps as NonNullable<(typeof bulkOps)[number]>[]);
        updated += result.modifiedCount;
      }

      processed += batch.length;
    }

    return NextResponse.json({
      success: true,
      message: `Re-tagged ${updated} content items`,
      stats: {
        total: totalCount,
        processed,
        updated,
        errors,
      },
    });
  } catch (error) {
    console.error('Error re-tagging content:', error);
    return NextResponse.json(
      { error: 'Failed to re-tag content' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    // Get stats on current tagging status
    const stats = await Content.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          withTags: [
            { $match: { tags: { $exists: true, $ne: [] } } },
            { $count: 'count' },
          ],
          byPlatform: [
            {
              $group: {
                _id: '$platform',
                total: { $sum: 1 },
                withTags: {
                  $sum: {
                    $cond: [
                      { $and: [{ $isArray: '$tags' }, { $gt: [{ $size: '$tags' }, 0] }] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    const result = stats[0];

    return NextResponse.json({
      total: result.total[0]?.count || 0,
      withTags: result.withTags[0]?.count || 0,
      byPlatform: result.byPlatform,
    });
  } catch (error) {
    console.error('Error getting tag stats:', error);
    return NextResponse.json(
      { error: 'Failed to get tag stats' },
      { status: 500 }
    );
  }
}
