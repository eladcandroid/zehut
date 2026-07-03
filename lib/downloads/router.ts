import type { Platform } from '@/lib/db/models/content';
import { connectDB } from '@/lib/db/connection';
import { DownloadEvent } from '@/lib/db/models/download-event';
import { shouldSkip, record } from './circuit-breaker';
import type { Resolver, ResolveInput, ResolveResult } from './resolvers/types';
import { cobaltResolver } from './resolvers/cobalt';
import { ytDlpResolver } from './resolvers/yt-dlp';
import { rapidApiResolver } from './resolvers/rapidapi';
import { spotifyRssResolver } from './resolvers/spotify-rss';

export interface ResolveDownloadInput {
  url: string;
  quality?: string;
  platform: Platform;
  contentId?: string | null;
}

export interface ResolveAttempt {
  resolver: string;
  error: string;
}

export interface ResolveDownloadResult extends ResolveResult {
  tier: number;
  resolverId: string;
}

export class DownloadResolveError extends Error {
  attempts: ResolveAttempt[];
  constructor(message: string, attempts: ResolveAttempt[]) {
    super(message);
    this.name = 'DownloadResolveError';
    this.attempts = attempts;
  }
}

const CHAINS: Record<Platform, Resolver[]> = {
  youtube: [cobaltResolver, ytDlpResolver, rapidApiResolver],
  instagram: [cobaltResolver, ytDlpResolver, rapidApiResolver],
  x: [cobaltResolver, ytDlpResolver],
  facebook: [cobaltResolver, ytDlpResolver, rapidApiResolver],
  spotify: [spotifyRssResolver],
  telegram: [],
};

const HEALTH_TTL_MS = 30 * 1000;
const healthCache = new Map<string, { ok: boolean; checkedAt: number }>();

async function isHealthy(resolver: Resolver): Promise<boolean> {
  if (!resolver.healthCheck) return true;
  const cached = healthCache.get(resolver.id);
  const now = Date.now();
  if (cached && now - cached.checkedAt < HEALTH_TTL_MS) {
    return cached.ok;
  }
  try {
    const ok = await resolver.healthCheck();
    healthCache.set(resolver.id, { ok, checkedAt: now });
    return ok;
  } catch {
    healthCache.set(resolver.id, { ok: false, checkedAt: now });
    return false;
  }
}

async function logEvent(args: {
  platform: Platform;
  tier: number;
  resolverId: string;
  success: boolean;
  latencyMs: number;
  error: string | null;
  contentId: string | null;
}): Promise<void> {
  try {
    await connectDB();
    await DownloadEvent.create({
      platform: args.platform,
      tier: args.tier,
      resolverId: args.resolverId,
      success: args.success,
      latencyMs: args.latencyMs,
      error: args.error,
      contentId: args.contentId,
      ts: new Date(),
    });
  } catch (err) {
    console.error('[downloads] failed to write download event', err);
  }
}

export async function resolveDownload(
  input: ResolveDownloadInput
): Promise<ResolveDownloadResult> {
  const chain = CHAINS[input.platform] ?? [];
  if (chain.length === 0) {
    throw new DownloadResolveError(`no resolvers for platform: ${input.platform}`, []);
  }

  const attempts: ResolveAttempt[] = [];
  const contentId = input.contentId ?? null;

  for (let i = 0; i < chain.length; i++) {
    const resolver = chain[i];
    const tier = i + 1;

    if (!resolver.supports(input.platform)) continue;

    if (shouldSkip(resolver.id)) {
      attempts.push({ resolver: resolver.id, error: 'circuit-open' });
      continue;
    }

    const healthy = await isHealthy(resolver);
    if (!healthy) {
      attempts.push({ resolver: resolver.id, error: 'unhealthy' });
      continue;
    }

    const resolveInput: ResolveInput = {
      url: input.url,
      quality: input.quality,
      platform: input.platform,
    };

    const startedAt = Date.now();
    try {
      const result = await resolver.resolve(resolveInput);
      const latencyMs = Date.now() - startedAt;
      record(resolver.id, true);
      void logEvent({
        platform: input.platform,
        tier,
        resolverId: resolver.id,
        success: true,
        latencyMs,
        error: null,
        contentId,
      });
      return { ...result, tier, resolverId: resolver.id };
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : String(err);
      record(resolver.id, false);
      attempts.push({ resolver: resolver.id, error: message });
      void logEvent({
        platform: input.platform,
        tier,
        resolverId: resolver.id,
        success: false,
        latencyMs,
        error: message,
        contentId,
      });
    }
  }

  throw new DownloadResolveError(
    `all resolvers failed for platform ${input.platform}`,
    attempts
  );
}
