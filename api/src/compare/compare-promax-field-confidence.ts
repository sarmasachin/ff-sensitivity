/**
 * Per-field agreement shrink: high disagreement (weighted MAD) → weaker offset.
 * Applied after sample-size confidence.
 */
export function fieldAgreementScale(mad: number): number {
  if (!Number.isFinite(mad) || mad < 0) return 1;
  if (mad <= 4) return 1.0;
  if (mad <= 8) return 0.75;
  if (mad <= 14) return 0.5;
  return 0.3;
}

/** Fire / sniper are noisier — extra caution when sample is thin. */
export function thinSampleFieldScale(field: string, n: number): number {
  if (n >= 5) return 1;
  if (field === 'fireButton' || field === 'sniper') return 0.85;
  return 1;
}

export function weightedMad(
  pairs: Array<{ w: number; v: number }>,
  mean: number,
): number {
  let wSum = 0;
  let acc = 0;
  for (const p of pairs) {
    if (p.w <= 0) continue;
    wSum += p.w;
    acc += p.w * Math.abs(p.v - mean);
  }
  if (wSum <= 0) return 0;
  return acc / wSum;
}
