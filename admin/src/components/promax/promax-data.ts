export type ProMaxShareConflictKnobs = {
  softGap: number;
  hardGap: number;
  maxShrink: number;
};

export type ProMaxConfigBundle = {
  shareConflict: ProMaxShareConflictKnobs;
};

export const DEFAULT_PROMAX_CONFIG: ProMaxConfigBundle = {
  shareConflict: {
    softGap: 8,
    hardGap: 35,
    maxShrink: 0.75,
  },
};

export function cloneProMaxConfig(
  raw?: ProMaxConfigBundle | null,
): ProMaxConfigBundle {
  const sc = raw?.shareConflict ?? DEFAULT_PROMAX_CONFIG.shareConflict;
  return {
    shareConflict: {
      softGap: Number(sc.softGap),
      hardGap: Number(sc.hardGap),
      maxShrink: Number(sc.maxShrink),
    },
  };
}

export function validateProMaxConfig(
  config: ProMaxConfigBundle,
): string | null {
  const { softGap, hardGap, maxShrink } = config.shareConflict;
  if (!Number.isFinite(softGap) || softGap < 0 || softGap > 50) {
    return "Soft gap must be 0–50.";
  }
  if (!Number.isFinite(hardGap) || hardGap < 1 || hardGap > 100) {
    return "Hard gap must be 1–100.";
  }
  if (hardGap <= softGap) {
    return "Hard gap must be greater than soft gap.";
  }
  if (!Number.isFinite(maxShrink) || maxShrink < 0 || maxShrink > 0.95) {
    return "Max shrink must be 0–0.95.";
  }
  return null;
}
