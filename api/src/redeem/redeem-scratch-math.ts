import { AppError } from '../common/errors/app-error';

export const REDEEM_SCRATCH_SAFE_TIP =
  'Scratch to earn Coins. Limited reward codes distributed via schedule.';

export function assertScratchAttemptKey(raw: string): string {
  const key = raw?.trim() ?? '';
  if (key.length < 8 || key.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(key)) {
    throw new AppError(
      'REDEEM_BAD_ATTEMPT',
      'Invalid scratch attempt key.',
      400,
    );
  }
  return key;
}

export function scratchWindowIndex(
  startsAt: Date,
  windowMinutes: number,
  now: Date,
): number {
  const mins = Math.max(1, windowMinutes);
  const elapsed = now.getTime() - startsAt.getTime();
  if (elapsed < 0) return -1;
  return Math.floor(elapsed / (mins * 60_000));
}

export function scratchWindowRange(
  startsAt: Date,
  windowMinutes: number,
  now: Date,
): { index: number; start: Date; end: Date } | null {
  const index = scratchWindowIndex(startsAt, windowMinutes, now);
  if (index < 0) return null;
  const mins = Math.max(1, windowMinutes);
  const startMs = startsAt.getTime() + index * mins * 60_000;
  return {
    index,
    start: new Date(startMs),
    end: new Date(startMs + mins * 60_000),
  };
}

export function rollScratchCoins(min: number, max: number): number {
  const lo = Math.max(0, Math.min(min, max));
  const hi = Math.max(lo, Math.max(min, max));
  if (hi === lo) return lo;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function isScratchCooldownActive(
  lastScratchAt: Date,
  windowMinutes: number,
  now: Date,
): boolean {
  const waitMs = Math.max(1, windowMinutes) * 60_000;
  return lastScratchAt.getTime() + waitMs > now.getTime();
}

/** First scratch is not guaranteed a code — chance stays open for later users. */
export function scratchCodeWinChance(opts: {
  remainingSlots: number;
  scratchesInWindow: number;
  remainingMs: number;
}): number {
  if (opts.remainingSlots <= 0) return 0;
  const remainingMin = Math.max(1, Math.ceil(opts.remainingMs / 60_000));
  const denom = opts.scratchesInWindow + remainingMin + 1;
  return opts.remainingSlots / denom;
}

export function shouldAwardScratchCode(
  opts: {
    remainingSlots: number;
    scratchesInWindow: number;
    remainingMs: number;
  },
  rng: () => number = Math.random,
): boolean {
  return rng() < scratchCodeWinChance(opts);
}
