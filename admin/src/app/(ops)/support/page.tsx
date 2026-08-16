"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SupportCapabilities } from "@/components/support/SupportCapabilities";
import { SupportEmptyState } from "@/components/support/SupportEmptyState";
import { SupportHeader } from "@/components/support/SupportHeader";
import { SupportPagination } from "@/components/support/SupportPagination";
import { SupportConfirmDialog } from "@/components/support/SupportConfirmDialog";
import { SupportStats } from "@/components/support/SupportStats";
import { SupportTable } from "@/components/support/SupportTable";
import { SupportThreadDrawer } from "@/components/support/SupportThreadDrawer";
import {
  SupportToolbar,
  type SupportFilterKey,
} from "@/components/support/SupportToolbar";
import {
  fetchSupportStats,
  fetchSupportThreads,
  type SupportStatsPayload,
} from "@/components/support/support-api";
import { canAccessSupport } from "@/components/support/support-access";
import { supportConfirmCopy, type SupportPendingAction } from "@/components/support/support-confirm";
import {
  computeSupportStats,
  supportListQuery,
  type SupportThreadRow,
} from "@/components/support/support-data";
import {
  closeThreadRow,
  deleteThreadRow,
  deleteUserMessageRow,
  markThreadRead,
  replyThreadRow,
} from "@/components/support/support-page-mutations";
import { SUPPORT_TOAST_TITLES } from "@/components/support/support-toast";
import { RedeemToastHost } from "@/components/redeem/RedeemToastHost";
import { useRedeemToasts } from "@/components/redeem/useRedeemToasts";

const PAGE_SIZE = 12;

export default function SupportPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<SupportThreadRow[]>([]);
  const [serverStats, setServerStats] = useState<SupportStatsPayload | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<SupportFilterKey>("all");
  const [page, setPage] = useState(1);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [pending, setPending] = useState<SupportPendingAction | null>(null);
  const [retryToastId, setRetryToastId] = useState<string | null>(null);
  const confirmingRef = useRef(false);
  const loadedOnce = useRef(false);
  const { toasts, push, dismiss } = useRedeemToasts();

  useEffect(() => {
    setAllowed(canAccessSupport());
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? loadedOnce.current;
      if (!silent) setLoading(true);
      try {
        const listOpts = supportListQuery(filter, debouncedQuery);
        const [threads, stats] = await Promise.all([
          fetchSupportThreads(listOpts),
          fetchSupportStats(),
        ]);
        setRows(threads);
        setServerStats(stats);
        loadedOnce.current = true;
        return true;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to load support inbox.";
        const id = push("error", SUPPORT_TOAST_TITLES.loadError, message, {
          actionLabel: "Retry",
          durationMs: 0,
        });
        setRetryToastId(id);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [filter, debouncedQuery, push],
  );

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    void load();
  }, [allowed, load]);

  useEffect(() => {
    setPage(1);
  }, [filter, debouncedQuery]);

  const stats = serverStats ?? computeSupportStats(rows);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const inspectRow = inspectId
    ? (rows.find((r) => r.id === inspectId) ?? null)
    : null;

  const markRead = useCallback(
    (id: string) => {
      void markThreadRead(id, setRows, setServerStats);
    },
    [],
  );

  async function runBusy(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      await load({ silent: true });
    } finally {
      setBusy(false);
    }
  }

  function askConfirm(action: SupportPendingAction) {
    if (busy || confirmingRef.current || pending) return;
    setPending(action);
  }

  async function runPending() {
    if (!pending || busy || confirmingRef.current) return;
    confirmingRef.current = true;
    const action = pending;
    try {
      await runBusy(async () => {
        if (action.kind === "close") {
          await closeThreadRow(
            action.threadId,
            rows,
            setRows,
            setServerStats,
            push,
            (id) => {
              if (inspectId === id) setInspectId(null);
            },
          );
        } else if (action.kind === "delete-thread") {
          await deleteThreadRow(
            action.threadId,
            rows,
            setRows,
            setServerStats,
            push,
            (id) => {
              if (inspectId === id) setInspectId(null);
            },
          );
        } else {
          await deleteUserMessageRow(
            action.threadId,
            action.messageId,
            setRows,
            setServerStats,
            push,
          );
        }
      });
    } finally {
      confirmingRef.current = false;
      setPending(null);
    }
  }

  const pendingRow = pending
    ? (rows.find((r) => r.id === pending.threadId) ?? null)
    : null;
  const confirmCopy =
    pending && pendingRow ? supportConfirmCopy(pending, pendingRow) : null;

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

  const queueEmpty = !loading && stats.total === 0;
  const filterEmpty = !loading && stats.total > 0 && rows.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <SupportHeader
        onRefresh={() =>
          void load({ silent: false }).then((ok) => {
            if (ok) {
              push(
                "success",
                SUPPORT_TOAST_TITLES.success,
                "Inbox refreshed from Nest.",
              );
            }
          })
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
                onCloseThread={(id) =>
                  askConfirm({ kind: "close", threadId: id })
                }
                onDeleteThread={(id) =>
                  askConfirm({ kind: "delete-thread", threadId: id })
                }
              />
              <SupportPagination
                page={page}
                totalPages={totalPages}
                totalItems={rows.length}
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
        busy={busy}
        onClose={() => setInspectId(null)}
        onReply={(id, text) =>
          void runBusy(() =>
            replyThreadRow(id, text, rows, setRows, setServerStats, push),
          )
        }
        onMarkRead={markRead}
        onDeleteUserMessage={(threadId, messageId) =>
          askConfirm({ kind: "delete-message", threadId, messageId })
        }
        onDeleteThread={(id) =>
          askConfirm({ kind: "delete-thread", threadId: id })
        }
      />

      {confirmCopy ? (
        <SupportConfirmDialog
          open
          tone={confirmCopy.tone}
          eyebrow={confirmCopy.eyebrow}
          title={confirmCopy.title}
          description={confirmCopy.description}
          detail={confirmCopy.detail}
          note={confirmCopy.note}
          confirmLabel={confirmCopy.confirmLabel}
          busyLabel={confirmCopy.busyLabel}
          busy={busy}
          onCancel={() => {
            if (!busy && !confirmingRef.current) setPending(null);
          }}
          onConfirm={() => void runPending()}
        />
      ) : null}

      <RedeemToastHost
        toasts={toasts}
        onDismiss={dismiss}
        onAction={(id) => {
          if (id === retryToastId) {
            dismiss(id);
            setRetryToastId(null);
            void load();
          }
        }}
      />
    </section>
  );
}
