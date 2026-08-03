"use client";

import { useEffect, useMemo, useState } from "react";
import { WalletsCapabilities } from "@/components/wallets/WalletsCapabilities";
import { WalletsDetailDrawer } from "@/components/wallets/WalletsDetailDrawer";
import { WalletsEmptyState } from "@/components/wallets/WalletsEmptyState";
import {
  WalletsGrantModal,
  type WalletAdjustPayload,
} from "@/components/wallets/WalletsGrantModal";
import { WalletsHeader } from "@/components/wallets/WalletsHeader";
import { WalletsLedgerTable } from "@/components/wallets/WalletsLedgerTable";
import { WalletsPagination } from "@/components/wallets/WalletsPagination";
import { WalletsStats } from "@/components/wallets/WalletsStats";
import { WalletsTable } from "@/components/wallets/WalletsTable";
import { WalletsTabs } from "@/components/wallets/WalletsTabs";
import {
  WalletsToolbar,
  type WalletsFilterKey,
} from "@/components/wallets/WalletsToolbar";
import {
  LEDGER_DEMO_ROWS,
  WALLETS_DEMO_ROWS,
  computeWalletStats,
  type LedgerEntry,
  type WalletListRow,
  type WalletsTabId,
} from "@/components/wallets/wallets-data";

const PAGE_SIZE = 5;
const HIGH_BALANCE = 500;

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletListRow[]>(() => [
    ...WALLETS_DEMO_ROWS,
  ]);
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => [
    ...LEDGER_DEMO_ROWS,
  ]);
  const [tab, setTab] = useState<WalletsTabId>("balances");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WalletsFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantPreset, setGrantPreset] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filter, query, tab]);

  useEffect(() => {
    setFilter("all");
    setQuery("");
  }, [tab]);

  const stats = useMemo(
    () => computeWalletStats(wallets, ledger),
    [wallets, ledger],
  );

  const filteredWallets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wallets.filter((row) => {
      if (filter === "active" && row.status !== "ACTIVE") return false;
      if (filter === "frozen" && row.status !== "FROZEN") return false;
      if (filter === "zero" && row.balance !== 0) return false;
      if (filter === "high" && row.balance < HIGH_BALANCE) return false;
      if (!q) return true;
      const hay = [row.deviceId, row.label, row.note].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [wallets, query, filter]);

  const filteredLedger = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledger.filter((row) => {
      if (filter === "grant" && row.kind !== "GRANT" && row.kind !== "REVOKE") {
        return false;
      }
      if (filter === "purchase" && row.kind !== "PURCHASE") return false;
      if (filter === "spend" && row.kind !== "SPEND") return false;
      if (!q) return true;
      const hay = [row.deviceId, row.label, row.reason, row.kind, row.actor]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ledger, query, filter]);

  const filteredTotal =
    tab === "balances" ? filteredWallets.length : filteredLedger.length;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedWallets = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredWallets.slice(start, start + PAGE_SIZE);
  }, [filteredWallets, safePage]);

  const pagedLedger = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredLedger.slice(start, start + PAGE_SIZE);
  }, [filteredLedger, safePage]);

  const inspectRow = inspectId
    ? (wallets.find((w) => w.id === inspectId) ?? null)
    : null;

  function openAdjust(walletId?: string) {
    setGrantPreset(walletId ?? null);
    setGrantOpen(true);
  }

  function freezeWallet(id: string) {
    const row = wallets.find((w) => w.id === id);
    if (!row) return;
    setWallets((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              status: "FROZEN",
              note: `${w.note} · Frozen by staff.`,
              lastTxnLabel: "just now",
              lastTxnHoursAgo: 0,
            }
          : w,
      ),
    );
    setLedger((prev) => [
      {
        id: `l_${Date.now()}`,
        walletId: id,
        deviceId: row.deviceId,
        label: row.label.split(" · ")[0] ?? row.label,
        kind: "ADJUST",
        amount: 0,
        balanceAfter: row.balance,
        reason: "Wallet frozen by staff",
        whenLabel: "just now",
        actor: "staff",
      },
      ...prev,
    ]);
    setNotice(`Frozen wallet ${row.deviceId}.`);
  }

  function unfreezeWallet(id: string) {
    const row = wallets.find((w) => w.id === id);
    if (!row) return;
    setWallets((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              status: "ACTIVE",
              note: "Unfrozen by staff. Earn/spend restored.",
              lastTxnLabel: "just now",
              lastTxnHoursAgo: 0,
            }
          : w,
      ),
    );
    setLedger((prev) => [
      {
        id: `l_${Date.now()}`,
        walletId: id,
        deviceId: row.deviceId,
        label: row.label.split(" · ")[0] ?? row.label,
        kind: "ADJUST",
        amount: 0,
        balanceAfter: row.balance,
        reason: "Wallet unfrozen by staff",
        whenLabel: "just now",
        actor: "staff",
      },
      ...prev,
    ]);
    setNotice(`Unfrozen wallet ${row.deviceId}.`);
  }

  function applyAdjust(payload: WalletAdjustPayload) {
    const row = wallets.find((w) => w.id === payload.walletId);
    if (!row) return;
    const delta =
      payload.mode === "grant" ? payload.amount : -payload.amount;
    const nextBalance = Math.max(0, row.balance + delta);
    setWallets((prev) =>
      prev.map((w) =>
        w.id === payload.walletId
          ? {
              ...w,
              balance: nextBalance,
              lifetimeEarned:
                payload.mode === "grant"
                  ? w.lifetimeEarned + payload.amount
                  : w.lifetimeEarned,
              lifetimeSpent:
                payload.mode === "revoke"
                  ? w.lifetimeSpent + payload.amount
                  : w.lifetimeSpent,
              lastTxnLabel: "just now",
              lastTxnHoursAgo: 0,
              note: `${payload.mode === "grant" ? "Grant" : "Revoke"}: ${payload.reason}`,
            }
          : w,
      ),
    );
    setLedger((prev) => [
      {
        id: `l_${Date.now()}`,
        walletId: payload.walletId,
        deviceId: row.deviceId,
        label: row.label.split(" · ")[0] ?? row.label,
        kind: payload.mode === "grant" ? "GRANT" : "REVOKE",
        amount: delta,
        balanceAfter: nextBalance,
        reason: payload.reason,
        whenLabel: "just now",
        actor: "staff",
      },
      ...prev,
    ]);
    setGrantOpen(false);
    setNotice(
      `${payload.mode === "grant" ? "Granted" : "Revoked"} ${payload.amount.toLocaleString()} coins on ${row.deviceId}.`,
    );
  }

  const queueEmpty =
    tab === "balances" ? wallets.length === 0 : ledger.length === 0;
  const filterEmpty = !queueEmpty && filteredTotal === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <WalletsHeader
        onGrant={() => openAdjust()}
        onRefresh={() =>
          setNotice("Refresh will sync from Nest wallet service next.")
        }
        onExport={() =>
          setNotice("CSV export will work after Wallets API is connected.")
        }
      />
      <WalletsStats
        total={stats.total}
        coinsInCirculation={stats.coinsInCirculation}
        frozen={stats.frozen}
        zero={stats.zero}
        staffMoves={stats.staffMoves}
      />
      <WalletsTabs active={tab} onChange={setTab} />
      <WalletsToolbar
        mode={tab}
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />

      {queueEmpty ? (
        <WalletsEmptyState kind="queue" />
      ) : filterEmpty ? (
        <WalletsEmptyState
          kind="filter"
          onClearFilter={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      ) : tab === "balances" ? (
        <WalletsTable
          rows={pagedWallets}
          notice={notice}
          onInspect={setInspectId}
          onFreeze={freezeWallet}
          onUnfreeze={unfreezeWallet}
          onAdjust={(id) => openAdjust(id)}
          footer={
            <WalletsPagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filteredWallets.length}
              onPage={setPage}
            />
          }
        />
      ) : (
        <WalletsLedgerTable
          rows={pagedLedger}
          notice={notice}
          footer={
            <WalletsPagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filteredLedger.length}
              onPage={setPage}
            />
          }
        />
      )}

      <WalletsCapabilities />

      <WalletsDetailDrawer
        open={!!inspectRow}
        row={inspectRow}
        ledger={ledger}
        onClose={() => setInspectId(null)}
        onFreeze={freezeWallet}
        onUnfreeze={unfreezeWallet}
        onAdjust={(id) => {
          setInspectId(null);
          openAdjust(id);
        }}
      />

      <WalletsGrantModal
        open={grantOpen}
        wallets={wallets}
        presetWalletId={grantPreset}
        onClose={() => setGrantOpen(false)}
        onSubmit={applyAdjust}
      />
    </section>
  );
}
