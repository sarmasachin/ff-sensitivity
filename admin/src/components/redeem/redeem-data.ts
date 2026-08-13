export type RedeemStatus = "ACTIVE" | "PAUSED" | "EXHAUSTED" | "EXPIRED";
export type RedeemMode = "SINGLE" | "SCRATCH_REWARD";

export type RedeemTypeRow = {
  id: string;
  label: string;
  sortOrder: number;
  enabled: boolean;
};

export type RedeemCadenceRow = {
  id: string;
  label: string;
  claimLimit: number;
  windowHours: number;
  sortOrder: number;
  enabled: boolean;
};

export const SAFE_SCRATCH_TIP =
  "Scratch to earn Coins. Limited reward codes distributed via schedule.";

export type RedeemListRow = {
  id: string;
  title: string;
  type: string;
  valueLabel: string;
  codeSecret: string;
  codeMasked: string;
  status: RedeemStatus;
  cadence: string;
  mode: RedeemMode;
  stockLeft: number;
  poolLeft: number | null;
  coinCost: number | null;
  coinRewardMin: number | null;
  coinRewardMax: number | null;
  startsAt: string | null;
  endsAt: string | null;
  windowMinutes: number;
  codesPerWindow: number;
  expiresLabel: string;
  tip: string;
  redeemUrl: string;
};

export type RedeemFormValues = {
  cardMode: RedeemMode;
  title: string;
  type: string;
  valueLabel: string;
  codeSecret: string;
  codePoolText: string;
  status: RedeemStatus;
  cadence: string;
  stockLeft: number;
  coinCost: string;
  coinRewardMin: string;
  coinRewardMax: string;
  startsAtLocal: string;
  endsAtLocal: string;
  windowMinutes: string;
  codesPerWindow: string;
  expiresLabel: string;
  tip: string;
  redeemUrl: string;
};

export function maskCode(secret: string): string {
  const clean = secret.trim();
  if (clean.length <= 8) return "••••••••";
  const parts = clean.split("-");
  if (parts.length >= 4) {
    return `${parts[0]}-••••-••••-${parts[parts.length - 1]}`;
  }
  return `${clean.slice(0, 4)}-••••-••••-${clean.slice(-4)}`;
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function emptyRedeemForm(): RedeemFormValues {
  return {
    cardMode: "SINGLE",
    title: "",
    type: "GOOGLE_PLAY",
    valueLabel: "",
    codeSecret: "",
    codePoolText: "",
    status: "ACTIVE",
    cadence: "DAILY",
    stockLeft: 1,
    coinCost: "",
    coinRewardMin: "5",
    coinRewardMax: "20",
    startsAtLocal: "",
    endsAtLocal: "",
    windowMinutes: "30",
    codesPerWindow: "1",
    expiresLabel: "",
    tip: "First Come, First Serve!",
    redeemUrl: "https://play.google.com/redeem",
  };
}

export function emptyScratchRewardForm(): RedeemFormValues {
  return {
    ...emptyRedeemForm(),
    cardMode: "SCRATCH_REWARD",
    tip: SAFE_SCRATCH_TIP,
    valueLabel: "Coins + limited codes",
    expiresLabel: "Schedule",
  };
}

export function rowToForm(row: RedeemListRow): RedeemFormValues {
  const mode = row.mode ?? "SINGLE";
  return {
    cardMode: mode,
    title: row.title,
    type: row.type,
    valueLabel: row.valueLabel,
    codeSecret: "",
    codePoolText: "",
    status: row.status,
    cadence: row.cadence,
    stockLeft: row.stockLeft === 0 ? 0 : 1,
    coinCost: row.coinCost == null ? "" : String(row.coinCost),
    coinRewardMin:
      row.coinRewardMin == null ? "5" : String(row.coinRewardMin),
    coinRewardMax:
      row.coinRewardMax == null ? "20" : String(row.coinRewardMax),
    startsAtLocal: toLocalInput(row.startsAt),
    endsAtLocal: toLocalInput(row.endsAt),
    windowMinutes: String(row.windowMinutes ?? 30),
    codesPerWindow: String(row.codesPerWindow ?? 1),
    expiresLabel: row.expiresLabel,
    tip: row.tip,
    redeemUrl: row.redeemUrl,
  };
}

export function computeRedeemStats(rows: RedeemListRow[]) {
  return {
    active: rows.filter((r) => r.status === "ACTIVE" && r.stockLeft > 0).length,
    low: rows.filter((r) => r.status === "ACTIVE" && r.stockLeft === 1).length,
    paused: rows.filter((r) => r.status === "PAUSED").length,
    expiring: rows.filter((r) =>
      /hour|tonight|24|soon/i.test(r.expiresLabel),
    ).length,
  };
}

export const REDEEM_CAPABILITIES = [
  {
    title: "Live inventory",
    body: "Add Single codes or Scratch-reward cards. The Android redeem tab reads this same database.",
  },
  {
    title: "Scratch reward (safe)",
    body: "Coins every scratch. Limited codes drip by schedule. Ad unlocks another scratch — not a gift code.",
  },
  {
    title: "Masked list + reveal",
    body: "List stays masked. Reveal loads secrets from the API and writes an audit row.",
  },
  {
    title: "Pool top-up",
    body: "Append more codes to a live Scratch-reward card for upcoming days without recreating it.",
  },
  {
    title: "Dynamic Type / Cadence",
    body: "Add new reward types and app tabs from admin — same live pattern as shop categories.",
  },
];
