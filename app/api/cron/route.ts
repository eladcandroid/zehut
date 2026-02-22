import type { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Content, FetchJob } from '@/lib/db/models';
import type { Platform } from '@/lib/db/models';
import { getScraper, isRelevantContent, type FetchProgress } from '@/lib/scrapers';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  await connectDB();

  // Find all enabled jobs
  const jobs = await FetchJob.find({ isEnabled: true }).lean();

  if (jobs.length === 0) {
    return Response.json({ success: true, message: 'No enabled jobs found', results: [] });
  }

  const results = [];

  for (const job of jobs) {
    const startTime = Date.now();
    const { platform, sourceId, sourceType } = job;
    const maxItems = job.config?.maxItems || 500;

    try {
      const scraper = getScraper(platform as Platform);
      if (!scraper) {
        results.push({ platform, sourceId, error: `Unknown platform: ${platform}` });
        continue;
      }

      // Mark job as running
      await FetchJob.findByIdAndUpdate(job._id, {
        $set: {
          status: 'running',
          lastRun: new Date(),
          progress: { fetched: 0, total: maxItems, message: 'Cron: מתחיל...' },
        },
      });

      // Progress callback
      let lastProgressUpdate = 0;
      const updateProgress = async (progress: FetchProgress) => {
        const now = Date.now();
        if (now - lastProgressUpdate < 2000) return;
        lastProgressUpdate = now;
        await FetchJob.findByIdAndUpdate(job._id, { $set: { progress } });
      };

      // Fetch content
      let items;
      if (sourceType === 'search') {
        items = await scraper.searchContent(sourceId, { maxItems, onProgress: updateProgress });
      } else {
        items = await scraper.fetchContent(sourceId, { maxItems, onProgress: updateProgress });
      }

      // Filter for relevance
      let filteredCount = 0;
      const filteredItems = items.filter((item) => {
        const validation = isRelevantContent(item.title, item.description || '', item.author?.id || '');
        if (!validation.isRelevant) {
          filteredCount++;
          return false;
        }
        return true;
      });

      // Save to database
      let newItems = 0;
      for (const item of filteredItems) {
        try {
          await Content.findOneAndUpdate(
            { platform: item.platform, platformId: item.platformId },
            {
              $set: { ...item, fetchedAt: new Date() },
              $setOnInsert: {
                shareCount: 0,
                viewCount: 0,
                isActive: true,
                isPinned: false,
                priority: 0,
              },
            },
            { upsert: true }
          );
          newItems++;
        } catch {
          // Duplicate, skip
        }
      }

      const duration = Date.now() - startTime;

      // Update job with results
      await FetchJob.findByIdAndUpdate(job._id, {
        $set: {
          status: 'completed',
          lastRun: new Date(),
          lastResult: {
            itemsFetched: items.length,
            filteredCount,
            newItems,
            errorMessages: [],
            duration,
          },
        },
        $unset: { progress: 1 },
      });

      results.push({ platform, sourceId, itemsFetched: items.length, filteredCount, newItems, duration });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      await FetchJob.findByIdAndUpdate(job._id, {
        $set: {
          status: 'failed',
          lastRun: new Date(),
          lastResult: {
            itemsFetched: 0,
            newItems: 0,
            errorMessages: [errorMessage],
            duration,
          },
        },
        $unset: { progress: 1 },
      });

      results.push({ platform, sourceId, error: errorMessage, duration });
    }
  }

  return Response.json({ success: true, jobsRun: results.length, results });
}
