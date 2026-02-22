import type { MetadataRoute } from 'next';
import { connectDB } from '@/lib/db/connection';
import { Content } from '@/lib/db/models';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://zehut.vercel.app';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  // Dynamic content pages — generate tag-filtered URLs for popular tags
  try {
    await connectDB();

    const tagAggregation = await Content.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    const tagPages: MetadataRoute.Sitemap = tagAggregation.map((tag) => ({
      url: `${baseUrl}?tags=${encodeURIComponent(tag._id)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...tagPages];
  } catch {
    return staticPages;
  }
}
