import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDownloadEvent extends Document {
  platform: string;
  tier: number;
  resolverId: string;
  success: boolean;
  latencyMs: number;
  error: string | null;
  contentId: string | null;
  ts: Date;
}

const DownloadEventSchema = new Schema<IDownloadEvent>(
  {
    platform: { type: String, required: true },
    tier: { type: Number, required: true },
    resolverId: { type: String, required: true },
    success: { type: Boolean, required: true },
    latencyMs: { type: Number, required: true },
    error: { type: String, default: null },
    contentId: { type: String, default: null },
    ts: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

DownloadEventSchema.index({ ts: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
DownloadEventSchema.index({ platform: 1, ts: -1 });
DownloadEventSchema.index({ resolverId: 1, ts: -1 });
DownloadEventSchema.index({ success: 1, ts: -1 });

export const DownloadEvent: Model<IDownloadEvent> =
  mongoose.models.DownloadEvent ||
  mongoose.model<IDownloadEvent>('DownloadEvent', DownloadEventSchema);

export default DownloadEvent;
