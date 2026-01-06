import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDevice {
  userAgent: string;
  lastSeen: Date;
}

export interface IPreferences {
  theme?: 'light' | 'dark';
  platformFilters?: string[];
}

export interface IVisitor extends Document {
  visitorId: string;
  firstSeen: Date;
  lastSeen: Date;
  totalVisits: number;
  totalShares: number;
  contentViewed: Types.ObjectId[];
  devices: IDevice[];
  preferences?: IPreferences;
}

const DeviceSchema = new Schema<IDevice>(
  {
    userAgent: { type: String, required: true },
    lastSeen: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PreferencesSchema = new Schema<IPreferences>(
  {
    theme: { type: String, enum: ['light', 'dark'] },
    platformFilters: [{ type: String }],
  },
  { _id: false }
);

const VisitorSchema = new Schema<IVisitor>(
  {
    visitorId: { type: String, required: true, unique: true },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    totalVisits: { type: Number, default: 1 },
    totalShares: { type: Number, default: 0 },
    contentViewed: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
    devices: [DeviceSchema],
    preferences: PreferencesSchema,
  },
  {
    timestamps: false,
  }
);

// visitorId already has unique: true which creates an index
VisitorSchema.index({ lastSeen: -1 });

export const Visitor: Model<IVisitor> =
  mongoose.models.Visitor || mongoose.model<IVisitor>('Visitor', VisitorSchema);

export default Visitor;
