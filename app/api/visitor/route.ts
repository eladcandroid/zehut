import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { Visitor } from '@/lib/db/models';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { visitorId, userAgent } = body;

    if (!visitorId) {
      return NextResponse.json(
        { error: 'Visitor ID required' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Try to find existing visitor
    const existingVisitor = await Visitor.findOne({ visitorId });

    if (existingVisitor) {
      // Update existing visitor
      const deviceExists = existingVisitor.devices.some(
        (d) => d.userAgent === userAgent
      );

      const updateQuery: Record<string, unknown> = {
        $set: { lastSeen: now },
        $inc: { totalVisits: 1 },
      };

      if (!deviceExists && userAgent) {
        updateQuery.$push = {
          devices: { userAgent, lastSeen: now },
        };
      }

      const visitor = await Visitor.findOneAndUpdate(
        { visitorId },
        updateQuery,
        { new: true }
      ).lean();

      return NextResponse.json({
        visitor,
        isNew: false,
      });
    }

    // Create new visitor
    const newVisitor = new Visitor({
      visitorId,
      firstSeen: now,
      lastSeen: now,
      totalVisits: 1,
      totalShares: 0,
      contentViewed: [],
      devices: userAgent ? [{ userAgent, lastSeen: now }] : [],
    });

    await newVisitor.save();

    return NextResponse.json({
      visitor: newVisitor.toObject(),
      isNew: true,
    });
  } catch (error) {
    console.error('Error registering visitor:', error);
    return NextResponse.json(
      { error: 'Failed to register visitor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const visitorId = searchParams.get('visitorId');

    if (!visitorId) {
      return NextResponse.json(
        { error: 'Visitor ID required' },
        { status: 400 }
      );
    }

    const visitor = await Visitor.findOne({ visitorId }).lean();

    if (!visitor) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
    }

    return NextResponse.json(visitor);
  } catch (error) {
    console.error('Error fetching visitor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visitor' },
      { status: 500 }
    );
  }
}
