"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  fetchWalletLedger,
  fetchWallets,
  freezeWalletApi,
  grantCoinsApi,
  revokeCoinsApi,
} from "@/components/wallets/wallets-api";
import {
  computeWalletStats,
  type LedgerEntry,
  type WalletListRow,
  type WalletsTabId,
} from "@/components/wallets/wallets-data";

const PAGE_SIZE = 12;
const HIGH_BALANCE = 500;

function canAccessWallets(): boolean {
  if (typeof window === "undefined") return false;
  const raw =
    sessionStorage.getItem("ffops_admin") ?? localStorage.getItem("ffops_admin");
  if (!raw) return false;
  try {
    const admin = JSON.parse(raw) as {
      role?: string;
      allowedModules?: string[];
    };
    if (admin.role === "SUPER_ADMIN") return true;
    return Array.isArray(admin.allowedModules)
      ? admin.allowedModules.includes("wallets")
      : false;
  } catch {
    return false;
  }
}

function walletsCsv(rows: WalletListRow[]): string {
  const header = [
    "id",
    "deviceId",
    "label",
    "balance",
    "lifetimeEarned",
    "lifetimeSpent",
    "status",
    "lastTxnLabel",
  ];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.deviceId,
        r.label,
        r.balance,
        r.lifetimeEarned,
        r.lifetimeSpent,
        r.status,
        r.lastTxnLabel,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}

// --- Start: Wallets admin live wire (Sachin) ---
export default function WalletsPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [wallets, setWallets] = useState<WalletListRow[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [tab, setTab] = useState<WalletsTabId>("balances");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WalletsFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantPreset, setGrantPreset] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessWallets());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, l] = await Promise.all([fetchWallets(), fetchWalletLedger()]);
      setWallets(w);
      setLedger(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wallets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    void load();
  }, [allowed, load]);

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
      const hay = [row.deviceId, row.label, row.note, row.id]
        .join(" ")
        .toLowerCase();
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

  function replaceWallet(next: WalletListRow) {
    setWallets((prev) => prev.map((w) => (w.id === next.id ? next : w)));
  }

  function openAdjust(walletId?: string) {
    setGrantPreset(walletId ?? null);
    setGrantOpen(true);
  }

  async function freezeWallet(id: string) {
    setBusy(true);
    setError(null);
    try {
      const next = await freezeWalletApi(id, "freeze");
      replaceWallet(next);
      setNotice(`Frozen wallet ${next.deviceId}.`);
      const l = await fetchWalletLedger();
      setLedger(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Freeze failed.");
    } finally {
      setBusy(false);
    }
  }

  async function unfreezeWallet(id: string) {
    setBusy(true);
    setError(null);
    try {
      const next = await freezeWalletApi(id, "unfreeze");
      replaceWallet(next);
      setNotice(`Unfrozen wallet ${next.deviceId}.`);
      const l = await fetchWalletLedger();
      setLedger(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unfreeze failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyAdjust(payload: WalletAdjustPayload) {
    setBusy(true);
    setError(null);
    try {
      const body = {
        amount: payload.amount,
        reason: payload.reason,
        requestId: `adj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
        currentPassword: payload.currentPassword,
      };
      const next =
        payload.mode === "grant"
          ? await grantCoinsApi(payload.walletId, body)
          : await revokeCoinsApi(payload.walletId, body);
      replaceWallet(next);
      const l = await fetchWalletLedger();
      setLedger(l);
      setGrantOpen(false);
      setNotice(
        `${payload.mode === "grant" ? "Granted" : "Revoked"} ${payload.amount.toLocaleString()} coins on ${next.deviceId}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjust failed.");
    } finally {
      setBusy(false);
    }
  }

  function onExport() {
    const rows = tab === "balances" ? filteredWallets : [];
    if (tab === "balances" && rows.length === 0) {
      setNotice("Nothing to export.");
      return;
    }
    if (tab === "ledger") {
      setNotice("Switch to Balances tab to export wallet CSV.");
      return;
    }
    const blob = new Blob([walletsCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallets_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${rows.length} wallet row(s).`);
  }

  if (!allowed) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center text-[13px] font-medium text-rose-900">
          You do not have access to Wallets. Ask a Super Admin for the wallets
          module.
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-2xl border border-[#e8eaee] bg-white px-5 py-10 text-center text-[13px] text-slate-500">
          Loading wallets…
        </div>
      </section>
    );
  }

  const queueEmpty =
    tab === "balances" ? wallets.length === 0 : ledger.length === 0;
  const filterEmpty = !queueEmpty && filteredTotal === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <WalletsHeader
        onGrant={() => openAdjust()}
        onRefresh={() => {
          void load().then(() => setNotice("Synced from Nest wallet service."));
        }}
        onExport={onExport}
      />
      <WalletsStats
        total={stats.total}
        coinsInCirculation={stats.coinsInCirculation}
        frozen={stats.frozen}
        zero={stats.zero}
        staffMoves={stats.staffMoves}
      />
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-900"
        >
          {error}
        </div>
      ) : null}
      {busy ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-600">
          Updating wallet…
        </div>
      ) : null}
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
          onFreeze={(id) => void freezeWallet(id)}
          onUnfreeze={(id) => void unfreezeWallet(id)}
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
        onFreeze={(id) => void freezeWallet(id)}
        onUnfreeze={(id) => void unfreezeWallet(id)}
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
        onSubmit={(p) => void applyAdjust(p)}
      />
    </section>
  );
}
// --- End: Wallets admin live wire (Sachin) ---
