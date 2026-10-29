export type WalletsTabId = "balances" | "ledger";

export type WalletStatus = "ACTIVE" | "FROZEN";

export type LedgerKind =
  | "EARN"
  | "SPEND"
  | "GRANT"
  | "REVOKE"
  | "PURCHASE"
  | "ADJUST";

export type WalletListRow = {
  id: string;
  deviceId: string;
  label: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  status: WalletStatus;
  lastTxnLabel: string;
  lastTxnHoursAgo: number;
  note: string;
};

export type LedgerEntry = {
  id: string;
  walletId: string;
  deviceId: string;
  label: string;
  kind: LedgerKind;
  amount: number;
  balanceAfter: number;
  reason: string;
  whenLabel: string;
  actor: "system" | "staff" | "store";
};

export const WALLET_STATUS_LABEL: Record<WalletStatus, string> = {
  ACTIVE: "Active",
  FROZEN: "Frozen",
};

export const LEDGER_KIND_LABEL: Record<LedgerKind, string> = {
  EARN: "Earn",
  SPEND: "Spend",
  GRANT: "Grant",
  REVOKE: "Revoke",
  PURCHASE: "Purchase",
  ADJUST: "Adjust",
};


export const WALLETS_CAPABILITIES = [
  {
    title: "Server balances",
    body: "Authoritative coin balances per device id — Android mirrors, never invents, the server total.",
  },
  {
    title: "Ledger",
    body: "Append-only earn / spend / grant / revoke / purchase lines with balance-after for audit.",
  },
  {
    title: "Grant / revoke",
    body: "Staff adjustments with a required reason. Frozen wallets reject spend until unfrozen.",
  },
  {
    title: "Purchase audits",
    body: "Play Billing coin packs land as PURCHASE rows — reconcile against Google order ids later.",
  },
  {
    title: "Freeze",
    body: "Lock a wallet during abuse review without deleting history or lifetime totals.",
  },
  {
    title: "Export",
    body: "CSV of balances for finance review. Emails are masked in the desk.",
  },
] as const;

export type WalletDeskStats = {
  total: number;
  frozen: number;
  zero: number;
  coinsInCirculation: number;
  staffMoves: number;
};

export function computeWalletStats(
  wallets: WalletListRow[],
  ledger: LedgerEntry[],
) {
  const total = wallets.length;
  const frozen = wallets.filter((w) => w.status === "FROZEN").length;
  const zero = wallets.filter((w) => w.balance === 0).length;
  const coinsInCirculation = wallets.reduce((sum, w) => sum + w.balance, 0);
  const staffMoves = ledger.filter(
    (l) => l.kind === "GRANT" || l.kind === "REVOKE",
  ).length;
  const purchases = ledger.filter((l) => l.kind === "PURCHASE").length;
  return {
    total,
    frozen,
    zero,
    coinsInCirculation,
    staffMoves,
    purchases,
  };
}

/** Cards follow the database totals. After a grant or freeze, the loaded rows take over. */
export function walletCardStats(
  wallets: WalletListRow[],
  ledger: LedgerEntry[],
  desk: WalletDeskStats | null,
) {
  const live = computeWalletStats(wallets, ledger);
  if (!desk) return live;
  const listComplete = wallets.length >= desk.total;
  return {
    total: Math.max(desk.total, live.total),
    frozen: listComplete ? live.frozen : desk.frozen,
    zero: listComplete ? live.zero : desk.zero,
    coinsInCirculation: listComplete
      ? live.coinsInCirculation
      : desk.coinsInCirculation,
    staffMoves: Math.max(desk.staffMoves, live.staffMoves),
    purchases: live.purchases,
  };
}

export function signedCoins(n: number): string {
  if (n > 0) return `+${n.toLocaleString()}`;
  return n.toLocaleString();
}
