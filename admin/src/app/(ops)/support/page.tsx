"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SupportCapabilities } from "@/components/support/SupportCapabilities";
import { SupportEmptyState } from "@/components/support/SupportEmptyState";
import { SupportHeader } from "@/components/support/SupportHeader";
import { SupportPagination } from "@/components/support/SupportPagination";
import { SupportStats } from "@/components/support/SupportStats";
import { SupportTable } from "@/components/support/SupportTable";
import { SupportThreadDrawer } from "@/components/support/SupportThreadDrawer";
import {
  SupportToolbar,
  type SupportFilterKey,
} from "@/components/support/SupportToolbar";
import {
  closeSupportThread,
  fetchSupportStats,
  fetchSupportThreads,
  markSupportRead,
  replySupportThread,
  type SupportStatsPayload,
} from "@/components/support/support-api";
import {
  computeSupportStats,
  type SupportThreadRow,
} from "@/components/support/support-data";

const PAGE_SIZE = 12;

function canAccessSupport(): boolean {
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
      ? admin.allowedModules.includes("support")
      : false;
  } catch {
    return false;
  }
}

export default function SupportPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<SupportThreadRow[]>([]);
  const [serverStats, setServerStats] = useState<SupportStatsPayload | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SupportFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessSupport());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [threads, stats] = await Promise.all([
        fetchSupportThreads(),
        fetchSupportStats(),
      ]);
      setRows(threads);
      setServerStats(stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load support inbox.");
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

  const localStats = useMemo(() => computeSupportStats(rows), [rows]);
  const stats = serverStats ?? localStats;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "open") {
        if (row.status !== "OPEN" && row.status !== "PENDING_REPLY") {
          return false;
        }
      }
      if (filter === "unread" && !row.unread) return false;
      if (filter === "replied" && row.status !== "REPLIED") return false;
      if (filter === "closed" && row.status !== "CLOSED") return false;
      if (filter === "bug" && row.subject !== "BUG") return false;
      if (filter === "redeem" && row.subject !== "REDEEM_CODE_ISSUE") {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.name,
        row.email,
        row.subject,
        row.deviceLabel,
        row.appVersion,
        ...row.messages.map((m) => m.text),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
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

  function upsertRow(next: SupportThreadRow) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === next.id);
      if (idx < 0) return [next, ...prev];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }

  async function closeThread(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busy) return;
    if (!window.confirm(`Close thread with ${row.name}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const next = await closeSupportThread(id);
      upsertRow(next);
      setServerStats(await fetchSupportStats());
      setNotice(`Closed thread with ${row.name}.`);
      if (inspectId === id) setInspectId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Close failed.");
    } finally {
      setBusy(false);
    }
  }

  async function markRead(id: string) {
    try {
      const next = await markSupportRead(id);
      upsertRow(next);
      setServerStats(await fetchSupportStats());
    } catch {
      // Non-blocking — drawer still usable.
    }
  }

  async function reply(id: string, text: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await replySupportThread(id, text);
      upsertRow(next);
      setServerStats(await fetchSupportStats());
      setNotice(`Replied to ${row.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
        <h1 className="text-[17px] font-bold text-rose-950">No Support access</h1>
        <p className="mt-2 text-[13px] text-rose-800">
          Your staff role is missing the <code>support</code> module.
        </p>
      </section>
    );
  }

  const queueEmpty = !loading && rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <SupportHeader
        onRefresh={() =>
          void load().then(() => setNotice("Inbox refreshed from Nest."))
        }
      />
      <SupportStats
        total={stats.total}
        open={stats.open}
        unread={stats.unread}
        replied={stats.replied}
        closed={stats.closed}
      />

      {loading ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-400">
          Loading support inbox…
        </p>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-900"
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-[13px] font-medium text-sky-950"
        >
          {notice}
        </div>
      ) : null}

      {!loading ? (
        <>
          <SupportToolbar
            query={query}
            filter={filter}
            onQuery={setQuery}
            onFilter={setFilter}
          />

          {queueEmpty ? (
            <SupportEmptyState
              title="Inbox empty"
              body="New Contact Us threads from Android will appear here."
            />
          ) : filterEmpty ? (
            <SupportEmptyState
              title="No matches"
              body="Try another search or filter."
            />
          ) : (
            <>
              <SupportTable
                rows={paged}
                onOpen={setInspectId}
                onCloseThread={(id) => void closeThread(id)}
              />
              <SupportPagination
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPage={setPage}
              />
            </>
          )}

          <SupportCapabilities />
        </>
      ) : null}

      <SupportThreadDrawer
        open={Boolean(inspectId)}
        row={inspectRow}
        onClose={() => setInspectId(null)}
        onReply={(id, text) => void reply(id, text)}
        onMarkRead={(id) => void markRead(id)}
      />
    </section>
  );
}
