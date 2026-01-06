import mongoose, { Schema, Document, Model } from 'mongoose';

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'telegram' | 'x' | 'facebook';
export type ContentType = 'video' | 'image' | 'text' | 'reel' | 'story';

export interface IAuthor {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  profileUrl: string;
}

export interface IPlatformMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  lastUpdated: Date;
}

export interface IContent extends Document {
  platformId: string;
  platform: Platform;
  type: ContentType;
  title: string;
  description: string;
  thumbnailUrl: string;
  contentUrl: string;
  embedUrl?: string;
  mediaUrls: string[];
  author: IAuthor;
  platformMetrics: IPlatformMetrics;
  shareCount: number;
  viewCount: number;
  publishedAt: Date;
  fetchedAt: Date;
  updatedAt: Date;
  tags: string[];
  language: string;
  isActive: boolean;
  isPinned: boolean;
  priority: number;
}

const AuthorSchema = new Schema<IAuthor>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    handle: { type: String, required: true },
    avatarUrl: { type: String },
    profileUrl: { type: String, required: true },
  },
  { _id: false }
);

const PlatformMetricsSchema = new Schema<IPlatformMetrics>(
  {
    views: { type: Number },
    likes: { type: Number },
    comments: { type: Number },
    shares: { type: Number },
    lastUpdated: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ContentSchema = new Schema<IContent>(
  {
    platformId: { type: String, required: true },
    platform: {
      type: String,
      enum: ['youtube', 'tiktok', 'instagram', 'telegram', 'x', 'facebook'],
      required: true,
    },
    type: {
      type: String,
      enum: ['video', 'image', 'text', 'reel', 'story'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    contentUrl: { type: String, required: true },
    embedUrl: { type: String },
    mediaUrls: [{ type: String }],
    author: { type: AuthorSchema, required: true },
    platformMetrics: { type: PlatformMetricsSchema, default: {} },
    shareCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    publishedAt: { type: Date, required: true },
    fetchedAt: { type: Date, default: Date.now },
    tags: [{ type: String }],
    language: { type: String, default: 'he' },
    isActive: { type: Boolean, default: true },
    isPinned: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

ContentSchema.index({ platform: 1, platformId: 1 }, { unique: true });
ContentSchema.index({ publishedAt: -1 });
ContentSchema.index({ shareCount: -1 });
ContentSchema.index({ tags: 1 });
ContentSchema.index({ isActive: 1, publishedAt: -1 });

export const Content: Model<IContent> =
  mongoose.models.Content || mongoose.model<IContent>('Content', ContentSchema);

export default Content;
