import { apiFetch } from "@/lib/api";
import type { LedgerEntry, WalletListRow } from "./wallets-data";

// --- Start: Wallets admin live wire (Sachin) ---
export async function fetchWallets(): Promise<WalletListRow[]> {
  const data = await apiFetch<{ wallets: WalletListRow[] }>(
    "/api/v1/admin/wallets",
  );
  return data.wallets ?? [];
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
