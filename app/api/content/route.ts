import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Content, type Platform } from '@/lib/db/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const platform = searchParams.get('platform') as Platform | null;
    const sort = searchParams.get('sort') || 'newest';
    const search = searchParams.get('search');

    const query: Record<string, unknown> = { isActive: true };

    if (platform) {
      query.platform = platform;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: Record<string, Record<string, 1 | -1>> = {
      newest: { publishedAt: -1 },
      oldest: { publishedAt: 1 },
      popular: { 'platformMetrics.views': -1 },
      shares: { shareCount: -1 },
    };

    const skip = (page - 1) * limit;
    const sortConfig = sortOptions[sort] || sortOptions.newest;

    const [content, total] = await Promise.all([
      Content.find(query)
        .sort(sortConfig as { [key: string]: 1 | -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Content.countDocuments(query),
    ]);

    return NextResponse.json({
      content,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + content.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const content = new Content(body);
    await content.save();

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') as Platform | null;

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      );
    }

    const result = await Content.deleteMany({ platform });

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} ${platform} items`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
