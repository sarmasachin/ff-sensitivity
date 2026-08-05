"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClaimsCapabilities } from "@/components/claims/ClaimsCapabilities";
import { ClaimsDetailDrawer } from "@/components/claims/ClaimsDetailDrawer";
import { ClaimsEmptyState } from "@/components/claims/ClaimsEmptyState";
import { ClaimsHeader } from "@/components/claims/ClaimsHeader";
import { ClaimsPagination } from "@/components/claims/ClaimsPagination";
import { ClaimsPolicyCard } from "@/components/claims/ClaimsPolicyCard";
import { ClaimsStats } from "@/components/claims/ClaimsStats";
import { ClaimsTable } from "@/components/claims/ClaimsTable";
import {
  ClaimsToolbar,
  type ClaimsFilterKey,
} from "@/components/claims/ClaimsToolbar";
import {
  deleteClaimApi,
  fetchClaims,
  fetchClaimsStats,
  flagClaimApi,
} from "@/components/claims/claims-api";
import {
  computeClaimStats,
  type ClaimListRow,
} from "@/components/claims/claims-data";

const PAGE_SIZE = 12;

function canAccessClaimsModule(): boolean {
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
      ? admin.allowedModules.includes("claims")
      : false;
  } catch {
    return false;
  }
}

export default function ClaimsPage() {
  const [allowed, setAllowed] = useState(true);
  const [rows, setRows] = useState<ClaimListRow[]>([]);
  const [statsRemote, setStatsRemote] = useState<ReturnType<
    typeof computeClaimStats
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClaimsFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessClaimsModule());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, stats] = await Promise.all([
        fetchClaims(),
        fetchClaimsStats(),
      ]);
      setRows(list);
      setStatsRemote({
        copied: stats.copied,
        blocked: stats.blocked,
        flagged: stats.flagged,
        devices: stats.devices,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load claims.");
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
  }, [filter, query]);

  const stats = statsRemote ?? computeClaimStats(rows);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "copied" && row.result !== "SUCCESS") return false;
      if (
        filter === "blocked" &&
        row.result !== "ALREADY_CLAIMED" &&
        row.result !== "COPY_FAILED"
      ) {
        return false;
      }
      if (
        filter === "abuse" &&
        !(row.result === "FLAGGED" || row.abuseScore >= 60)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        row.deviceId.toLowerCase().includes(q) ||
        row.refId.toLowerCase().includes(q) ||
        row.codeMasked.toLowerCase().includes(q) ||
        row.note.toLowerCase().includes(q) ||
        (row.userDisplayName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const inspectRow = inspectId
    ? (rows.find((r) => r.id === inspectId) ?? null)
    : null;

  async function flagClaim(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const updated = await flagClaimApi(id, true);
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setNotice(`Flagged “${row.title}” for abuse review.`);
      const stats = await fetchClaimsStats();
      setStatsRemote(stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Flag failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function clearFlag(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const updated = await flagClaimApi(
        id,
        false,
        "Cleared by staff after review.",
      );
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setNotice(`Cleared flag on “${row.title}”.`);
      const stats = await fetchClaimsStats();
      setStatsRemote(stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteClaim(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busyId) return;
    const ok = window.confirm(
      `Delete claim for “${row.title}” (${row.codeMasked})? Stock will NOT be restored.`,
    );
    if (!ok) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteClaimApi(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (inspectId === id) setInspectId(null);
      setNotice(`Deleted claim for “${row.title}”.`);
      const stats = await fetchClaimsStats();
      setStatsRemote(stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
        <p className="text-[15px] font-semibold text-slate-900">
          Claims module locked
        </p>
        <p className="mt-2 text-[13px] text-slate-600">
          Your staff role does not include the claims module. Ask a Super Admin
          to grant access.
        </p>
      </section>
    );
  }

  const queueEmpty = !loading && !error && rows.length === 0;
  const filterEmpty =
    !loading && !error && rows.length > 0 && filtered.length === 0;

  function exportCsv() {
    if (rows.length === 0) {
      setNotice("No claims to export.");
      return;
    }
    const header = [
      "id",
      "title",
      "refId",
      "codeMasked",
      "user",
      "result",
      "when",
      "stockAfter",
      "abuseScore",
      "note",
    ];
    const lines = [
      header.join(","),
      ...filtered.map((r) =>
        [
          r.id,
          r.title,
          r.refId,
          r.codeMasked,
          r.deviceId,
          r.result,
          r.whenLabel,
          r.stockAfter,
          r.abuseScore,
          `"${r.note.replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claims-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${filtered.length} claim row(s).`);
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <ClaimsHeader onExport={exportCsv} />
      <ClaimsPolicyCard />
      <ClaimsStats
        copied={stats.copied}
        blocked={stats.blocked}
        flagged={stats.flagged}
        devices={stats.devices}
      />
      <ClaimsToolbar
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-[13px] text-slate-500">
          Loading claims ledger…
        </div>
      ) : queueEmpty ? (
        <ClaimsEmptyState kind="queue" />
      ) : filterEmpty ? (
        <ClaimsEmptyState
          kind="filter"
          onClearFilter={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      ) : (
        <ClaimsTable
          rows={paged}
          notice={notice}
          onInspect={setInspectId}
          onFlag={(id) => void flagClaim(id)}
          onClear={(id) => void clearFlag(id)}
          onDelete={(id) => void deleteClaim(id)}
          footer={
            <ClaimsPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPage={setPage}
            />
          }
        />
      )}

      <ClaimsCapabilities />

      <ClaimsDetailDrawer
        open={Boolean(inspectRow)}
        row={inspectRow}
        onClose={() => setInspectId(null)}
      />
    </section>
  );
}
