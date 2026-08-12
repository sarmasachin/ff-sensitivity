export type RedeemType = "GOOGLE_PLAY" | "FF_DIAMONDS";
export type RedeemStatus = "ACTIVE" | "PAUSED" | "EXHAUSTED" | "EXPIRED";
export type RedeemCadence = "DAILY" | "WEEKLY";

export type RedeemListRow = {
  id: string;
  title: string;
  type: RedeemType;
  valueLabel: string;
  codeSecret: string;
  codeMasked: string;
  status: RedeemStatus;
  cadence: RedeemCadence;
  stockLeft: number;
  coinCost: number | null;
  expiresLabel: string;
  tip: string;
  redeemUrl: string;
};

export type RedeemFormValues = {
  title: string;
  type: RedeemType;
  valueLabel: string;
  codeSecret: string;
  status: RedeemStatus;
  cadence: RedeemCadence;
  stockLeft: number;
  coinCost: string;
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

export function emptyRedeemForm(): RedeemFormValues {
  return {
    title: "",
    type: "GOOGLE_PLAY",
    valueLabel: "",
    codeSecret: "",
    status: "ACTIVE",
    cadence: "DAILY",
    stockLeft: 1,
    coinCost: "",
    expiresLabel: "",
    tip: "First Come, First Serve!",
    redeemUrl: "https://play.google.com/redeem",
  };
}

export function rowToForm(row: RedeemListRow): RedeemFormValues {
  return {
    title: row.title,
    type: row.type,
    valueLabel: row.valueLabel,
    codeSecret: "",
    status: row.status,
    cadence: row.cadence,
    stockLeft: row.stockLeft === 0 ? 0 : 1,
    coinCost: row.coinCost == null ? "" : String(row.coinCost),
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
    body: "Add, edit, pause, or delete codes. The Android redeem tab reads this same database.",
  },
  {
    title: "Masked list + reveal",
    body: "List stays masked. Reveal loads the secret from the API and writes an audit row.",
  },
  {
    title: "One secret per row",
    body: "Stock is 0 or 1. Each gift code is its own inventory row.",
  },
  {
    title: "Claim log",
    body: "Who claimed what is on the live Claims API — open Claim log from the header.",
  },
  {
    title: "Daily / Weekly",
    body: "Cadence matches the app tabs — daily pool vs weekly streak bonus.",
  },
];
