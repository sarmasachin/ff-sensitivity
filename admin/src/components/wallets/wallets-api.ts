import { apiFetch } from "@/lib/api";
import type {
  LedgerEntry,
  WalletDeskStats,
  WalletListRow,
} from "./wallets-data";

export type { WalletDeskStats };

// --- Start: Wallets admin live wire (Sachin) ---
export async function fetchWallets(): Promise<{
  wallets: WalletListRow[];
  stats: WalletDeskStats;
}> {
  const data = await apiFetch<{
    wallets?: WalletListRow[];
    stats?: WalletDeskStats;
  }>("/api/v1/admin/wallets");
  const wallets = data.wallets ?? [];
  const stats = data.stats ?? {
    total: wallets.length,
    frozen: wallets.filter((w) => w.status === "FROZEN").length,
    zero: wallets.filter((w) => w.balance === 0).length,
    coinsInCirculation: wallets.reduce((sum, w) => sum + w.balance, 0),
    staffMoves: 0,
  };
  return { wallets, stats };
}

export async function fetchWalletLedger(): Promise<LedgerEntry[]> {
  const data = await apiFetch<{ ledger: LedgerEntry[] }>(
    "/api/v1/admin/wallets/ledger",
  );
  return data.ledger ?? [];
}

export async function grantCoinsApi(
  userId: string,
  body: {
    amount: number;
    reason: string;
    requestId: string;
    currentPassword?: string;
  },
): Promise<WalletListRow> {
  const data = await apiFetch<{ wallet: WalletListRow }>(
    `/api/v1/admin/wallets/${encodeURIComponent(userId)}/grant`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return data.wallet;
}

export async function revokeCoinsApi(
  userId: string,
  body: {
    amount: number;
    reason: string;
    requestId: string;
    currentPassword?: string;
  },
): Promise<WalletListRow> {
  const data = await apiFetch<{ wallet: WalletListRow }>(
    `/api/v1/admin/wallets/${encodeURIComponent(userId)}/revoke`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return data.wallet;
}

export async function freezeWalletApi(
  userId: string,
  action: "freeze" | "unfreeze",
): Promise<WalletListRow> {
  const data = await apiFetch<{ wallet: WalletListRow }>(
    `/api/v1/admin/wallets/${encodeURIComponent(userId)}/freeze`,
    { method: "POST", body: JSON.stringify({ action }) },
  );
  return data.wallet;
}
// --- End: Wallets admin live wire (Sachin) ---
