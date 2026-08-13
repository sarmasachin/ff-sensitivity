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

export function rollScratchCoins(min: number, max: number): number {
  const lo = Math.max(0, Math.min(min, max));
  const hi = Math.max(lo, Math.max(min, max));
  if (hi === lo) return lo;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
