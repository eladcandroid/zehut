import type { Platform } from '@/lib/db/models/content';

export interface ResolveInput {
  url: string;
  quality?: string;
  platform: Platform;
}

export interface ResolveResult {
  mediaUrl: string;
  filename: string;
  contentType: string;
  viaCorsCdn: boolean;
  proxySecret?: string;
}

export interface Resolver {
  id: string;
  supports(platform: Platform): boolean;
  resolve(input: ResolveInput): Promise<ResolveResult>;
  healthCheck?(): Promise<boolean>;
}
