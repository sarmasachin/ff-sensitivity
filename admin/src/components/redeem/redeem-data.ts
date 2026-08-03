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
    codeSecret: row.codeSecret,
    status: row.status,
    cadence: row.cadence,
    stockLeft: row.stockLeft,
    coinCost: row.coinCost == null ? "" : String(row.coinCost),
    expiresLabel: row.expiresLabel,
    tip: row.tip,
    redeemUrl: row.redeemUrl,
  };
}

export function formToRow(
  values: RedeemFormValues,
  id: string,
): RedeemListRow | { error: string } {
  const title = values.title.trim();
  const valueLabel = values.valueLabel.trim();
  const codeSecret = values.codeSecret.trim().toUpperCase();
  if (!title) return { error: "Title is required." };
  if (!valueLabel) return { error: "Value is required." };
  if (codeSecret.length < 8) return { error: "Code must be at least 8 characters." };
  if (!Number.isFinite(values.stockLeft) || values.stockLeft < 0) {
    return { error: "Stock must be 0 or more." };
  }
  const coinRaw = values.coinCost.trim();
  const coinCost = coinRaw === "" ? null : Number(coinRaw);
  if (coinCost != null && (!Number.isFinite(coinCost) || coinCost < 0)) {
    return { error: "Coin cost must be a valid number." };
  }
  return {
    id,
    title,
    type: values.type,
    valueLabel,
    codeSecret,
    codeMasked: maskCode(codeSecret),
    status: values.status,
    cadence: values.cadence,
    stockLeft: Math.floor(values.stockLeft),
    coinCost,
    expiresLabel: values.expiresLabel.trim() || "No expiry",
    tip: values.tip.trim() || "First Come, First Serve!",
    redeemUrl: values.redeemUrl.trim() || "https://play.google.com/redeem",
  };
}

export function computeRedeemStats(rows: RedeemListRow[]) {
  return {
    active: rows.filter((r) => r.status === "ACTIVE" && r.stockLeft > 0).length,
    low: rows.filter((r) => r.status === "ACTIVE" && r.stockLeft > 0 && r.stockLeft <= 2)
      .length,
    paused: rows.filter((r) => r.status === "PAUSED").length,
    expiring: rows.filter((r) =>
      /hour|tonight|24|soon/i.test(r.expiresLabel),
    ).length,
  };
}

function seed(
  partial: Omit<RedeemListRow, "codeMasked"> & { codeSecret: string },
): RedeemListRow {
  return { ...partial, codeMasked: maskCode(partial.codeSecret) };
}

/** Local demo inventory — replaced by API later. */
export const REDEEM_DEMO_ROWS: RedeemListRow[] = [
  seed({
    id: "1",
    title: "Google Play Gift Card",
    type: "GOOGLE_PLAY",
    valueLabel: "₹50 INR",
    codeSecret: "ABCD-8X92-K12M-99PL",
    status: "ACTIVE",
    cadence: "DAILY",
    stockLeft: 5,
    coinCost: null,
    expiresLabel: "In 4 hours",
    tip: "First Come, First Serve!",
    redeemUrl: "https://play.google.com/redeem",
  }),
  seed({
    id: "2",
    title: "Google Play Gift Card",
    type: "GOOGLE_PLAY",
    valueLabel: "₹100 INR",
    codeSecret: "WEEK-9K21-M88P-12QT",
    status: "ACTIVE",
    cadence: "WEEKLY",
    stockLeft: 2,
    coinCost: null,
    expiresLabel: "7-day streak",
    tip: "Complete 7-day streak for a bigger chance!",
    redeemUrl: "https://play.google.com/redeem",
  }),
  seed({
    id: "3",
    title: "Play Gift — low stock",
    type: "GOOGLE_PLAY",
    valueLabel: "₹10 INR",
    codeSecret: "LOWX-7K21-P90Q-0001",
    status: "ACTIVE",
    cadence: "DAILY",
    stockLeft: 1,
    coinCost: 500,
    expiresLabel: "Tonight",
    tip: "First Come, First Serve!",
    redeemUrl: "https://play.google.com/redeem",
  }),
  seed({
    id: "4",
    title: "Google Play Gift Card",
    type: "GOOGLE_PLAY",
    valueLabel: "₹10 INR",
    codeSecret: "USED-0000-0000-0001",
    status: "EXHAUSTED",
    cadence: "DAILY",
    stockLeft: 0,
    coinCost: null,
    expiresLabel: "Expired",
    tip: "First Come, First Serve!",
    redeemUrl: "https://play.google.com/redeem",
  }),
  seed({
    id: "5",
    title: "Google Play Gift Card",
    type: "GOOGLE_PLAY",
    valueLabel: "₹20 INR",
    codeSecret: "HOLD-9K21-M88P-55ZX",
    status: "PAUSED",
    cadence: "DAILY",
    stockLeft: 4,
    coinCost: null,
    expiresLabel: "Paused by admin",
    tip: "First Come, First Serve!",
    redeemUrl: "https://play.google.com/redeem",
  }),
];

export const REDEEM_CAPABILITIES = [
  {
    title: "Code inventory",
    body: "Create / edit / pause codes — type, value, stock, expiry, coin cost, tip, redeem URL.",
  },
  {
    title: "Masked list + reveal",
    body: "List always masked. Full secret reveal is audited (Super Admin / Admin).",
  },
  {
    title: "CSV bulk import",
    body: "Import rows with per-row error report (partial success supported).",
  },
  {
    title: "Claim log",
    body: "Who claimed what, device id, result, stock decrement in a DB transaction.",
  },
  {
    title: "Daily / Weekly cadence",
    body: "Match app tabs — daily pool vs weekly streak bonus inventory.",
  },
  {
    title: "Comments moderation",
    body: "Per-code drawer — open Comments on a row. Hide/delete without flooding the inventory page.",
  },
];
