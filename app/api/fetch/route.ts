import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Content, FetchJob, type Platform } from '@/lib/db/models';
import { getScraper, type RawContentItem } from '@/lib/scrapers';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { platform, sourceId, sourceType, searchQuery, maxItems = 500 } = body;

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    const scraper = getScraper(platform as Platform);
    if (!scraper) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    let items: RawContentItem[] = [];
    const errorMessages: string[] = [];

    try {
      if (searchQuery) {
        // Search mode
        items = await scraper.searchContent(searchQuery, { maxItems });
      } else if (sourceId) {
        // Fetch from specific source
        items = await scraper.fetchContent(sourceId, { maxItems });
      } else {
        return NextResponse.json(
          { error: 'Either sourceId or searchQuery is required' },
          { status: 400 }
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorMessages.push(errorMessage);
    }

    // Save items to database
    let newItems = 0;
    for (const item of items) {
      try {
        await Content.findOneAndUpdate(
          { platform: item.platform, platformId: item.platformId },
          {
            $set: {
              ...item,
              fetchedAt: new Date(),
            },
            $setOnInsert: {
              shareCount: 0,
              viewCount: 0,
              isActive: true,
              isPinned: false,
              priority: 0,
            },
          },
          { upsert: true, new: true }
        );
        newItems++;
      } catch (error) {
        // Likely duplicate, skip
        console.warn(`[Fetch] Skipping duplicate: ${item.platformId}`);
      }
    }

    const duration = Date.now() - startTime;

    // Update or create fetch job record
    if (sourceId) {
      await FetchJob.findOneAndUpdate(
        { platform, sourceId },
        {
          $set: {
            platform,
            sourceType: sourceType || 'channel',
            sourceId,
            sourceName: sourceId,
            status: errorMessages.length > 0 ? 'failed' : 'completed',
            lastRun: new Date(),
            lastResult: {
              itemsFetched: items.length,
              newItems,
              errorMessages,
              duration,
            },
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      platform,
      sourceId,
      searchQuery,
      itemsFetched: items.length,
      newItems,
      errorMessages,
      duration,
    });
  } catch (error) {
    console.error('Error in fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    const query = platform ? { platform } : {};

    const jobs = await FetchJob.find(query)
      .sort({ lastRun: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
