export type ScratchKind = "MILESTONE" | "REDEEM" | "SHOP" | "GIFT";

export type ScratchPrizeRow = {
  id: string;
  title: string;
  detail: string;
  kind: ScratchKind;
  rewardLabel: string;
  coinReward: number;
  oddsPercent: number;
  enabled: boolean;
  streakDays: number | null;
};

export type ScratchFormValues = {
  id: string;
  title: string;
  detail: string;
  kind: ScratchKind;
  rewardLabel: string;
  coinReward: string;
  oddsPercent: string;
  enabled: boolean;
  streakDays: string;
};

export type ScratchPolicy = {
  retentionDays: number;
  autoPurge: boolean;
  showExpired: boolean;
};

/** Global roll when user scratches — admin-controlled, must total 100. */
export type ScratchOutcomeOdds = {
  coinsPercent: number;
  redeemPercent: number;
  coinAmount: number;
};

export const SCRATCH_DEFAULT_OUTCOME_ODDS: ScratchOutcomeOdds = {
  coinsPercent: 55,
  redeemPercent: 45,
  coinAmount: 50,
};

export function outcomeOddsTotal(odds: ScratchOutcomeOdds): number {
  return odds.coinsPercent + odds.redeemPercent;
}

export function validateOutcomeOdds(
  odds: ScratchOutcomeOdds,
): string | null {
  const keys: (keyof Pick<
    ScratchOutcomeOdds,
    "coinsPercent" | "redeemPercent"
  >)[] = ["coinsPercent", "redeemPercent"];
  for (const k of keys) {
    const v = odds[k];
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      return "Each outcome % must be between 0 and 100.";
    }
  }
  if (!Number.isFinite(odds.coinAmount) || odds.coinAmount < 0) {
    return "Coin amount must be 0 or more.";
  }
  const total = Math.round(outcomeOddsTotal(odds) * 10) / 10;
  if (total !== 100) {
    return `Outcome % must total 100 (now ${total}).`;
  }
  return null;
}

export const SCRATCH_KIND_LABEL: Record<ScratchKind, string> = {
  MILESTONE: "Milestone",
  REDEEM: "Redeem",
  SHOP: "Shop",
  GIFT: "Gift pool",
};

export function emptyScratchForm(): ScratchFormValues {
  return {
    id: "",
    title: "",
    detail: "",
    kind: "GIFT",
    rewardLabel: "",
    coinReward: "50",
    oddsPercent: "10",
    enabled: true,
    streakDays: "",
  };
}

export function rowToForm(row: ScratchPrizeRow): ScratchFormValues {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    kind: row.kind,
    rewardLabel: row.rewardLabel,
    coinReward: String(row.coinReward),
    oddsPercent: String(row.oddsPercent),
    enabled: row.enabled,
    streakDays: row.streakDays == null ? "" : String(row.streakDays),
  };
}

export function formToRow(
  values: ScratchFormValues,
  fallbackId: string,
): ScratchPrizeRow | { error: string } {
  const title = values.title.trim();
  const detail = values.detail.trim();
  const rewardLabel = values.rewardLabel.trim();
  const idRaw = values.id.trim().toLowerCase().replace(/\s+/g, "_");
  const id = idRaw || fallbackId;

  if (!title) return { error: "Title is required." };
  if (!detail) return { error: "Detail is required." };
  if (!rewardLabel) return { error: "Reward label is required." };
  if (!/^[a-z0-9_]+$/.test(id)) {
    return { error: "ID must use lowercase letters, numbers, and underscores." };
  }

  const coinReward = Number(values.coinReward);
  if (!Number.isFinite(coinReward) || coinReward < 0) {
    return { error: "Coin reward must be 0 or more." };
  }

  const oddsPercent = Number(values.oddsPercent);
  if (!Number.isFinite(oddsPercent) || oddsPercent < 0 || oddsPercent > 100) {
    return { error: "Odds must be between 0 and 100." };
  }

  const streakRaw = values.streakDays.trim();
  const streakDays = streakRaw === "" ? null : Number(streakRaw);
  if (streakDays != null && (!Number.isFinite(streakDays) || streakDays < 1)) {
    return { error: "Streak days must be empty or ≥ 1." };
  }
  if (values.kind === "MILESTONE" && streakDays == null) {
    return { error: "Milestone cards need streak days." };
  }

  return {
    id,
    title,
    detail,
    kind: values.kind,
    rewardLabel,
    coinReward: Math.floor(coinReward),
    oddsPercent: Math.round(oddsPercent * 10) / 10,
    enabled: values.enabled,
    streakDays: streakDays == null ? null : Math.floor(streakDays),
  };
}

export function computeScratchStats(rows: ScratchPrizeRow[]) {
  const live = rows.filter((r) => r.enabled).length;
  const gifts = rows.filter((r) => r.kind === "GIFT" && r.enabled).length;
  const milestones = rows.filter((r) => r.kind === "MILESTONE").length;
  const oddsSum = rows
    .filter((r) => r.enabled && r.kind === "GIFT")
    .reduce((sum, r) => sum + r.oddsPercent, 0);
  return { live, gifts, milestones, oddsSum: Math.round(oddsSum * 10) / 10 };
}

export const SCRATCH_DEFAULT_POLICY: ScratchPolicy = {
  retentionDays: 30,
  autoPurge: true,
  showExpired: false,
};

export const SCRATCH_CAPABILITIES = [
  {
    title: "Outcome odds (admin)",
    body: "Control % for Coins / Redeem code on every scratch (must total 100%).",
  },
  {
    title: "Prize table",
    body: "Configure gift-pool outcomes — title, coin reward, odds %, enable/disable.",
  },
  {
    title: "Gift odds",
    body: "Weight live GIFT rows so the Android scratch reveal can roll fairly.",
  },
  {
    title: "Streak bonus cards",
    body: "Milestone grants tied to Daily Challenge streak days.",
  },
  {
    title: "Redeem / Shop foils",
    body: "Templates for redeem unlock and shop token scratch cards.",
  },
  {
    title: "History policy",
    body: "Retention days (Android default 30) and auto-purge of expired cards.",
  },
  {
    title: "Live Nest sync",
    body: "Save pushes odds + prizes + policy. Android rolls via POST /api/v1/scratch/roll (server RNG).",
  },
];
