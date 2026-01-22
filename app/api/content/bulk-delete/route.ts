import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Content } from '@/lib/db/models';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids array is required' },
        { status: 400 }
      );
    }

    // Soft delete - set isActive to false for all matching IDs
    const result = await Content.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: false } }
    );

    return NextResponse.json({
      message: `Bulk deleted ${result.modifiedCount} content items`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error bulk deleting content:', error);
    return NextResponse.json(
      { error: 'Failed to bulk delete content' },
      { status: 500 }
    );
  }
}
