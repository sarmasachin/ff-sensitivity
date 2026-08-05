"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CommunityCapabilities } from "@/components/community/CommunityCapabilities";
import { CommunityDetailDrawer } from "@/components/community/CommunityDetailDrawer";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityPagination } from "@/components/community/CommunityPagination";
import { CommunityStats } from "@/components/community/CommunityStats";
import { CommunityTable } from "@/components/community/CommunityTable";
import {
  CommunityToolbar,
  type CommunityFilterKey,
} from "@/components/community/CommunityToolbar";
import {
  fetchCommunityPosts,
  fetchCommunityStats,
  patchCommunityStatus,
} from "@/components/community/community-api";
import {
  computeCommunityStats,
  type CommunityListRow,
  type CommunityStatus,
} from "@/components/community/community-data";

const PAGE_SIZE = 12;

function canAccessCommunityModule(): boolean {
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
      ? admin.allowedModules.includes("community")
      : false;
  } catch {
    return false;
  }
}

export default function CommunityPage() {
  const [allowed, setAllowed] = useState(true);
  const [rows, setRows] = useState<CommunityListRow[]>([]);
  const [statsRemote, setStatsRemote] = useState<ReturnType<
    typeof computeCommunityStats
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CommunityFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessCommunityModule());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, stats] = await Promise.all([
        fetchCommunityPosts(),
        fetchCommunityStats(),
      ]);
      setRows(list);
      setStatsRemote({
        pending: stats.pending,
        live: stats.live,
        featured: stats.featured,
        flagged: stats.flagged,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load community queue.",
      );
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

  const stats = statsRemote ?? computeCommunityStats(rows);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "pending" && row.status !== "PENDING") return false;
      if (
        filter === "live" &&
        row.status !== "APPROVED" &&
        row.status !== "FEATURED"
      ) {
        return false;
      }
      if (filter === "featured" && row.status !== "FEATURED") return false;
      if (filter === "hidden" && row.status !== "HIDDEN") return false;
      if (filter === "flagged" && !(row.reports > 0 || row.status === "HIDDEN")) {
        return false;
      }
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.freeFireId.includes(q) ||
        row.deviceLabel.toLowerCase().includes(q) ||
        row.rank.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
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

  async function setStatus(id: string, status: CommunityStatus, label: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const updated = await patchCommunityStatus(id, status);
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updated } : r)),
      );
      setNotice(`${label} “${row.name}”.`);
      const nextStats = await fetchCommunityStats();
      setStatsRemote({
        pending: nextStats.pending,
        live: nextStats.live,
        featured: nextStats.featured,
        flagged: nextStats.flagged,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
        <p className="text-[15px] font-semibold text-slate-900">
          Community module locked
        </p>
        <p className="mt-2 text-[13px] text-slate-600">
          Your staff role does not include the community module. Ask a Super
          Admin to grant access.
        </p>
      </section>
    );
  }

  const queueEmpty = !loading && !error && rows.length === 0;
  const filterEmpty =
    !loading && !error && rows.length > 0 && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <CommunityHeader
        onRefresh={() => {
          setNotice("Refreshing queue…");
          void load().then(() => setNotice("Queue refreshed."));
        }}
      />
      <CommunityStats
        pending={stats.pending}
        live={stats.live}
        featured={stats.featured}
        flagged={stats.flagged}
      />
      <CommunityToolbar
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
          Loading community queue…
        </div>
      ) : queueEmpty ? (
        <CommunityEmptyState kind="queue" />
      ) : filterEmpty ? (
        <CommunityEmptyState
          kind="filter"
          onClearFilter={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      ) : (
        <CommunityTable
          rows={paged}
          notice={notice}
          onInspect={setInspectId}
          onApprove={(id) => void setStatus(id, "APPROVED", "Approved")}
          onFeature={(id) => void setStatus(id, "FEATURED", "Featured")}
          onHide={(id) => void setStatus(id, "HIDDEN", "Hidden")}
          onUnhide={(id) =>
            void setStatus(id, "PENDING", "Restored to pending")
          }
          footer={
            <CommunityPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPage={setPage}
            />
          }
        />
      )}

      <CommunityCapabilities />

      <CommunityDetailDrawer
        open={Boolean(inspectRow)}
        row={inspectRow}
        onClose={() => setInspectId(null)}
      />
    </section>
  );
}
