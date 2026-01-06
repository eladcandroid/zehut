import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Platform } from './content';

export type SourceType = 'channel' | 'hashtag' | 'user' | 'search';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface IJobConfig {
  maxItems?: number;
  since?: Date;
  filters?: Record<string, unknown>;
}

export interface IJobResult {
  itemsFetched: number;
  newItems: number;
  errorMessages: string[];
  duration: number;
}

export interface IFetchJob extends Document {
  platform: Platform;
  sourceType: SourceType;
  sourceId: string;
  sourceName: string;
  config: IJobConfig;
  status: JobStatus;
  lastRun?: Date;
  nextRun?: Date;
  lastResult?: IJobResult;
  cronExpression?: string;
  isEnabled: boolean;
}

const JobConfigSchema = new Schema<IJobConfig>(
  {
    maxItems: { type: Number },
    since: { type: Date },
    filters: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const JobResultSchema = new Schema<IJobResult>(
  {
    itemsFetched: { type: Number, required: true },
    newItems: { type: Number, required: true },
    errorMessages: [{ type: String }],
    duration: { type: Number, required: true },
  },
  { _id: false }
);

const FetchJobSchema = new Schema<IFetchJob>(
  {
    platform: {
      type: String,
      enum: ['youtube', 'tiktok', 'instagram', 'telegram', 'x'],
      required: true,
    },
    sourceType: {
      type: String,
      enum: ['channel', 'hashtag', 'user', 'search'],
      required: true,
    },
    sourceId: { type: String, required: true },
    sourceName: { type: String, required: true },
    config: { type: JobConfigSchema, default: {} },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    lastRun: { type: Date },
    nextRun: { type: Date },
    lastResult: { type: JobResultSchema },
    cronExpression: { type: String },
    isEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

FetchJobSchema.index({ platform: 1, sourceId: 1 }, { unique: true });
FetchJobSchema.index({ isEnabled: 1, nextRun: 1 });
FetchJobSchema.index({ status: 1 });

export const FetchJob: Model<IFetchJob> =
  mongoose.models.FetchJob || mongoose.model<IFetchJob>('FetchJob', FetchJobSchema);

export default FetchJob;
