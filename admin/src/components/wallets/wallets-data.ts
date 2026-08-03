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

export const WALLETS_DEMO_ROWS: WalletListRow[] = [
  {
    id: "w1",
    deviceId: "dev_8f2a91c0",
    label: "Pixel 7 · Android 14",
    balance: 420,
    lifetimeEarned: 1280,
    lifetimeSpent: 860,
    status: "ACTIVE",
    lastTxnLabel: "18 min ago",
    lastTxnHoursAgo: 0.3,
    note: "Healthy wallet. Quiz + check-in earn path.",
  },
  {
    id: "w2",
    deviceId: "dev_11bc44e2",
    label: "Samsung A54 · Android 13",
    balance: 85,
    lifetimeEarned: 940,
    lifetimeSpent: 855,
    status: "ACTIVE",
    lastTxnLabel: "2h ago",
    lastTxnHoursAgo: 2,
    note: "High spend velocity on shop packs — watch closely.",
  },
  {
    id: "w3",
    deviceId: "dev_77c1d009",
    label: "OnePlus 11 · Android 14",
    balance: 12,
    lifetimeEarned: 210,
    lifetimeSpent: 198,
    status: "ACTIVE",
    lastTxnLabel: "4d ago",
    lastTxnHoursAgo: 96,
    note: "Low balance. Soft-update install; limited earn lately.",
  },
  {
    id: "w4",
    deviceId: "dev_99aa12ff",
    label: "Redmi Note 12 · Android 13",
    balance: 0,
    lifetimeEarned: 60,
    lifetimeSpent: 60,
    status: "ACTIVE",
    lastTxnLabel: "1d ago",
    lastTxnHoursAgo: 24,
    note: "Zero balance after shop cosmetic purchase.",
  },
  {
    id: "w5",
    deviceId: "dev_55ee90ab",
    label: "iQOO Neo · Android 14",
    balance: 960,
    lifetimeEarned: 2100,
    lifetimeSpent: 1140,
    status: "FROZEN",
    lastTxnLabel: "2d ago",
    lastTxnHoursAgo: 48,
    note: "Frozen pending redeem-abuse review. No spend/earn until cleared.",
  },
  {
    id: "w6",
    deviceId: "dev_33bb01aa",
    label: "Motorola G84 · Android 14",
    balance: 210,
    lifetimeEarned: 510,
    lifetimeSpent: 300,
    status: "ACTIVE",
    lastTxnLabel: "45 min ago",
    lastTxnHoursAgo: 0.75,
    note: "Clean wallet. QA handset for coin flows.",
  },
  {
    id: "w7",
    deviceId: "dev_emu34xx",
    label: "Emulator · API 34",
    balance: 50,
    lifetimeEarned: 50,
    lifetimeSpent: 0,
    status: "ACTIVE",
    lastTxnLabel: "14d ago",
    lastTxnHoursAgo: 336,
    note: "CI emulator — exclude from purchase audits.",
  },
  {
    id: "w8",
    deviceId: "dev_vivo29cc",
    label: "Vivo V29 · Android 14",
    balance: 5,
    lifetimeEarned: 180,
    lifetimeSpent: 175,
    status: "ACTIVE",
    lastTxnLabel: "12d ago",
    lastTxnHoursAgo: 288,
    note: "Stale install. Tiny residual balance.",
  },
];

export const LEDGER_DEMO_ROWS: LedgerEntry[] = [
  {
    id: "l1",
    walletId: "w1",
    deviceId: "dev_8f2a91c0",
    label: "Pixel 7",
    kind: "EARN",
    amount: 50,
    balanceAfter: 420,
    reason: "Daily Challenge quiz correct",
    whenLabel: "18 min ago",
    actor: "system",
  },
  {
    id: "l2",
    walletId: "w6",
    deviceId: "dev_33bb01aa",
    label: "Motorola G84",
    kind: "EARN",
    amount: 20,
    balanceAfter: 210,
    reason: "Daily check-in",
    whenLabel: "45 min ago",
    actor: "system",
  },
  {
    id: "l3",
    walletId: "w2",
    deviceId: "dev_11bc44e2",
    label: "Samsung A54",
    kind: "SPEND",
    amount: -100,
    balanceAfter: 85,
    reason: "Shop · Sensitivity frame unlock",
    whenLabel: "2h ago",
    actor: "store",
  },
  {
    id: "l4",
    walletId: "w1",
    deviceId: "dev_8f2a91c0",
    label: "Pixel 7",
    kind: "PURCHASE",
    amount: 500,
    balanceAfter: 370,
    reason: "Play Billing · Coin pack M",
    whenLabel: "5h ago",
    actor: "store",
  },
  {
    id: "l5",
    walletId: "w5",
    deviceId: "dev_55ee90ab",
    label: "iQOO Neo",
    kind: "ADJUST",
    amount: 0,
    balanceAfter: 960,
    reason: "Wallet frozen by staff (abuse review)",
    whenLabel: "2d ago",
    actor: "staff",
  },
  {
    id: "l6",
    walletId: "w4",
    deviceId: "dev_99aa12ff",
    label: "Redmi Note 12",
    kind: "SPEND",
    amount: -60,
    balanceAfter: 0,
    reason: "Shop · Gold wallet chip cosmetic",
    whenLabel: "1d ago",
    actor: "store",
  },
  {
    id: "l7",
    walletId: "w2",
    deviceId: "dev_11bc44e2",
    label: "Samsung A54",
    kind: "GRANT",
    amount: 100,
    balanceAfter: 185,
    reason: "Staff goodwill grant — support ticket #214",
    whenLabel: "3d ago",
    actor: "staff",
  },
  {
    id: "l8",
    walletId: "w3",
    deviceId: "dev_77c1d009",
    label: "OnePlus 11",
    kind: "REVOKE",
    amount: -40,
    balanceAfter: 12,
    reason: "Staff revoke — duplicate milestone payout",
    whenLabel: "4d ago",
    actor: "staff",
  },
  {
    id: "l9",
    walletId: "w1",
    deviceId: "dev_8f2a91c0",
    label: "Pixel 7",
    kind: "EARN",
    amount: 30,
    balanceAfter: 340,
    reason: "Rewarded ad bonus",
    whenLabel: "6h ago",
    actor: "system",
  },
  {
    id: "l10",
    walletId: "w8",
    deviceId: "dev_vivo29cc",
    label: "Vivo V29",
    kind: "SPEND",
    amount: -25,
    balanceAfter: 5,
    reason: "Shop · Name font pack",
    whenLabel: "12d ago",
    actor: "store",
  },
];

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
    body: "CSV of balances + recent ledger for finance review. Nest API wire-up next.",
  },
] as const;

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

export function signedCoins(n: number): string {
  if (n > 0) return `+${n.toLocaleString()}`;
  return n.toLocaleString();
}
