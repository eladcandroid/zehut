import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type ShareTarget = 'whatsapp' | 'telegram' | 'facebook' | 'x' | 'copy' | 'native';

export interface IShare extends Document {
  contentId: Types.ObjectId;
  visitorId: string;
  shareTarget: ShareTarget;
  timestamp: Date;
  userAgent: string;
  referrer?: string;
  campaignId?: string;
  sourceTag?: string;
}

const ShareSchema = new Schema<IShare>(
  {
    contentId: { type: Schema.Types.ObjectId, ref: 'Content', required: true },
    visitorId: { type: String, required: true },
    shareTarget: {
      type: String,
      enum: ['whatsapp', 'telegram', 'facebook', 'x', 'copy', 'native'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    userAgent: { type: String, default: '' },
    referrer: { type: String },
    campaignId: { type: String },
    sourceTag: { type: String },
  },
  {
    timestamps: false,
  }
);

ShareSchema.index({ contentId: 1 });
ShareSchema.index({ visitorId: 1 });
ShareSchema.index({ timestamp: -1 });
ShareSchema.index({ shareTarget: 1 });

export const Share: Model<IShare> =
  mongoose.models.Share || mongoose.model<IShare>('Share', ShareSchema);

export default Share;
