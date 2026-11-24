import {
  fieldAgreementScale,
  thinSampleFieldScale,
  weightedMad,
} from './compare-promax-field-confidence';

/** One Compare peer row as (actual − suggested) field deltas. */
export type PeerOffsetRow = {
  userId: string;
  deviceLabel: string;
  feedback: string;
  createdAt: Date;
  general: number;
  redDot: number;
  scope2x: number;
  scope4x: number;
  sniper: number;
  freeLook: number;
  fireButton: number;
};

export type PeerFieldOffsets = {
  general: number;
  redDot: number;
  scope2x: number;
  scope4x: number;
  sniper: number;
  freeLook: number;
  fireButton: number;
};

/** Per-field MAD agreement scale 0.3–1.0 (1 = peers agree). */
export type FieldAgreement = {
  general: number;
  redDot: number;
  scope2x: number;
  scope4x: number;
  sniper: number;
  freeLook: number;
  fireButton: number;
};

const ZERO: PeerFieldOffsets = {
  general: 0,
  redDot: 0,
  scope2x: 0,
  scope4x: 0,
  sniper: 0,
  freeLook: 0,
  fireButton: 0,
};

const AGREE_ONE: FieldAgreement = {
  general: 1,
  redDot: 1,
  scope2x: 1,
  scope4x: 1,
  sniper: 1,
  freeLook: 1,
  fireButton: 1,
};

const OUTLIER_GEN = 28;
const OUTLIER_FIRE = 15;
const DAY_MS = 86_400_000;
/** |general| below this is too small to judge feedback sign. */
const SIGN_EPS = 2;

export function feedbackWeight(feedback: string): number {
  if (feedback === 'perfect') return 1.0;
  if (feedback === 'too_fast' || feedback === 'too_slow') return 0.45;
  return 0.2;
}

/** Higher = better peer signal for per-user dedupe. */
function feedbackQuality(feedback: string): number {
  if (feedback === 'perfect') return 3;
  if (feedback === 'too_fast' || feedback === 'too_slow') return 2;
  return 1;
}

function isBetterPeerRow(
  candidate: PeerOffsetRow,
  current: PeerOffsetRow,
): boolean {
  const cq = feedbackQuality(candidate.feedback);
  const uq = feedbackQuality(current.feedback);
  if (cq !== uq) return cq > uq;
  const ct = candidate.createdAt?.getTime?.() ?? 0;
  const ut = current.createdAt?.getTime?.() ?? 0;
  return ct > ut;
}

/**
 * One compare row per userId so repeat saves cannot dominate the average.
 * Prefer perfect > directional feedback; same quality → newest createdAt.
 */
export function dedupePeersByUser(rows: PeerOffsetRow[]): PeerOffsetRow[] {
  const best = new Map<string, PeerOffsetRow>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const uid = String(row.userId ?? '').trim() || `__anon_${i}`;
    const prev = best.get(uid);
    if (!prev || isBetterPeerRow(row, prev)) {
      best.set(uid, row);
    }
  }
  return Array.from(best.values());
}

/**
 * Drop confused directional feedback: too_fast should lower general (neg),
 * too_slow should raise general (pos). perfect / tiny |general| always keep.
 */
export function feedbackSignConsistent(row: PeerOffsetRow): boolean {
  if (row.feedback === 'perfect') return true;
  if (row.feedback !== 'too_fast' && row.feedback !== 'too_slow') return true;
  if (!Number.isFinite(row.general) || Math.abs(row.general) < SIGN_EPS) {
    return true;
  }
  if (row.feedback === 'too_fast') return row.general < 0;
  return row.general > 0;
}

export function recencyWeight(createdAt: Date, nowMs: number): number {
  const ageDays = Math.max(0, (nowMs - createdAt.getTime()) / DAY_MS);
  if (ageDays <= 14) return 1.0;
  if (ageDays <= 45) return 0.8;
  if (ageDays <= 90) return 0.55;
  if (ageDays <= 180) return 0.35;
  return 0.22;
}

export function isOutlierPeer(row: PeerOffsetRow): boolean {
  if (Math.abs(row.general) > OUTLIER_GEN) return true;
  if (Math.abs(row.redDot) > OUTLIER_GEN) return true;
  if (Math.abs(row.scope2x) > OUTLIER_GEN) return true;
  if (Math.abs(row.scope4x) > OUTLIER_GEN) return true;
  if (Math.abs(row.sniper) > OUTLIER_GEN) return true;
  if (Math.abs(row.freeLook) > OUTLIER_GEN) return true;
  if (Math.abs(row.fireButton) > OUTLIER_FIRE) return true;
  return false;
}

export function confidenceScale(n: number): number {
  if (n >= 8) return 1.0;
  if (n >= 5) return 0.75;
  if (n >= 3) return 0.55;
  if (n >= 2) return 0.4;
  if (n >= 1) return 0.28;
  return 0;
}

function fieldMean(
  pairs: Array<{ w: number; v: number }>,
  wSum: number,
): number {
  if (wSum <= 0) return 0;
  let acc = 0;
  for (const p of pairs) acc += p.w * p.v;
  return acc / wSum;
}

function agreeFor(
  pairs: Array<{ w: number; v: number }>,
  wSum: number,
): number {
  if (wSum <= 0 || pairs.length === 0) return 1;
  const mean = fieldMean(pairs, wSum);
  return fieldAgreementScale(weightedMad(pairs, mean));
}

function finalizeField(
  pairs: Array<{ w: number; v: number }>,
  wSum: number,
  n: number,
  sampleConf: number,
  field: string,
  agree: number,
): number {
  const mean = fieldMean(pairs, wSum);
  const thin = thinSampleFieldScale(field, n);
  return Math.trunc(mean * sampleConf * agree * thin);
}

export function computeWeightedOffsets(
  rows: PeerOffsetRow[],
  nowMs = Date.now(),
): {
  n: number;
  offsets: PeerFieldOffsets;
  confidence: number;
  fieldAgreement: FieldAgreement;
} {
  const unique = dedupePeersByUser(rows);
  const gPairs: Array<{ w: number; v: number }> = [];
  const rdPairs: Array<{ w: number; v: number }> = [];
  const s2Pairs: Array<{ w: number; v: number }> = [];
  const s4Pairs: Array<{ w: number; v: number }> = [];
  const snPairs: Array<{ w: number; v: number }> = [];
  const flPairs: Array<{ w: number; v: number }> = [];
  const fbPairs: Array<{ w: number; v: number }> = [];
  let wSum = 0;
  let n = 0;

  for (const row of unique) {
    if (isOutlierPeer(row)) continue;
    if (!feedbackSignConsistent(row)) continue;
    const w = feedbackWeight(row.feedback) * recencyWeight(row.createdAt, nowMs);
    if (w <= 0) continue;
    wSum += w;
    gPairs.push({ w, v: row.general });
    rdPairs.push({ w, v: row.redDot });
    s2Pairs.push({ w, v: row.scope2x });
    s4Pairs.push({ w, v: row.scope4x });
    snPairs.push({ w, v: row.sniper });
    flPairs.push({ w, v: row.freeLook });
    fbPairs.push({ w, v: row.fireButton });
    n += 1;
  }

  if (n <= 0 || wSum <= 0) {
    return {
      n: 0,
      offsets: { ...ZERO },
      confidence: 0,
      fieldAgreement: { ...AGREE_ONE },
    };
  }

  const confidence = confidenceScale(n);
  const fieldAgreement: FieldAgreement = {
    general: agreeFor(gPairs, wSum),
    redDot: agreeFor(rdPairs, wSum),
    scope2x: agreeFor(s2Pairs, wSum),
    scope4x: agreeFor(s4Pairs, wSum),
    sniper: agreeFor(snPairs, wSum),
    freeLook: agreeFor(flPairs, wSum),
    fireButton: agreeFor(fbPairs, wSum),
  };
  return {
    n,
    confidence,
    fieldAgreement,
    offsets: {
      general: finalizeField(
        gPairs, wSum, n, confidence, 'general', fieldAgreement.general,
      ),
      redDot: finalizeField(
        rdPairs, wSum, n, confidence, 'redDot', fieldAgreement.redDot,
      ),
      scope2x: finalizeField(
        s2Pairs, wSum, n, confidence, 'scope2x', fieldAgreement.scope2x,
      ),
      scope4x: finalizeField(
        s4Pairs, wSum, n, confidence, 'scope4x', fieldAgreement.scope4x,
      ),
      sniper: finalizeField(
        snPairs, wSum, n, confidence, 'sniper', fieldAgreement.sniper,
      ),
      freeLook: finalizeField(
        flPairs, wSum, n, confidence, 'freeLook', fieldAgreement.freeLook,
      ),
      fireButton: finalizeField(
        fbPairs, wSum, n, confidence, 'fireButton', fieldAgreement.fireButton,
      ),
    },
  };
}
