import { AppError } from '../common/errors/app-error';

/** Tunable peer↔share conflict dampen (ProMax-only). */
export type ProMaxShareConflictKnobs = {
  softGap: number;
  hardGap: number;
  maxShrink: number;
};

export type ProMaxConfigBundle = {
  shareConflict: ProMaxShareConflictKnobs;
};

/** Defaults match ProMaxShareConflict.kt hardcoded values. */
export const DEFAULT_PROMAX_CONFIG: ProMaxConfigBundle = {
  shareConflict: {
    softGap: 8,
    hardGap: 35,
    maxShrink: 0.75,
  },
};

function asRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function clampNum(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeProMaxConfig(raw: unknown): ProMaxConfigBundle {
  const root = asRecord(raw);
  const sc = asRecord(root.shareConflict);
  const d = DEFAULT_PROMAX_CONFIG.shareConflict;
  let softGap = clampNum(sc.softGap, d.softGap, 0, 50);
  let hardGap = clampNum(sc.hardGap, d.hardGap, 1, 100);
  if (hardGap <= softGap) hardGap = Math.min(100, softGap + 1);
  const maxShrink = clampNum(sc.maxShrink, d.maxShrink, 0, 0.95);
  return {
    shareConflict: { softGap, hardGap, maxShrink },
  };
}

export function assertProMaxConfigForSave(
  raw: unknown,
): ProMaxConfigBundle {
  const normalized = normalizeProMaxConfig(raw);
  const { softGap, hardGap, maxShrink } = normalized.shareConflict;
  if (hardGap <= softGap) {
    throw new AppError(
      'PROMAX_BAD_GAPS',
      'Hard gap must be greater than soft gap.',
      400,
    );
  }
  if (maxShrink < 0 || maxShrink > 0.95) {
    throw new AppError(
      'PROMAX_BAD_SHRINK',
      'Max shrink must be between 0 and 0.95.',
      400,
    );
  }
  return normalized;
}
