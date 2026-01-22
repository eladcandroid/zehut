import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { FetchJob } from '@/lib/db/models';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { platform, sourceId, sourceType } = await request.json();

    if (!platform || !sourceId || !sourceType) {
      return NextResponse.json(
        { error: 'platform, sourceId, and sourceType are required' },
        { status: 400 }
      );
    }

    // Update job status to 'stopped' (will show as failed in UI)
    const result = await FetchJob.findOneAndUpdate(
      { platform, sourceId, sourceType, status: 'running' },
      {
        $set: { status: 'failed' },
        $unset: { progress: 1 },
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Job not found or not running' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job stopped',
      job: result,
    });
  } catch (error) {
    console.error('Error stopping job:', error);
    return NextResponse.json(
      { error: 'Failed to stop job' },
      { status: 500 }
    );
  }
}
