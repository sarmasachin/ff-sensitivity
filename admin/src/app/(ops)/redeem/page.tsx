"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RedeemCapabilities } from "@/components/redeem/RedeemCapabilities";
import { RedeemClaimLogDrawer } from "@/components/redeem/RedeemClaimLogDrawer";
import { RedeemCommentsDrawer } from "@/components/redeem/RedeemCommentsDrawer";
import { RedeemEmptyState } from "@/components/redeem/RedeemEmptyState";
import {
  createRedeemCode,
  deleteRedeemCode,
  fetchRedeemCodes,
  formToApiBody,
  revealRedeemCode,
  updateRedeemCode,
} from "@/components/redeem/redeem-api";
import {
  computeRedeemStats,
  emptyRedeemForm,
  rowToForm,
  type RedeemFormValues,
  type RedeemListRow,
} from "@/components/redeem/redeem-data";
import { RedeemFormModal } from "@/components/redeem/RedeemFormModal";
import { RedeemHeader } from "@/components/redeem/RedeemHeader";
import { RedeemPagination } from "@/components/redeem/RedeemPagination";
import { RedeemRevealModal } from "@/components/redeem/RedeemRevealModal";
import { RedeemStats } from "@/components/redeem/RedeemStats";
import { RedeemTable } from "@/components/redeem/RedeemTable";
import {
  RedeemToolbar,
  type RedeemFilterKey,
} from "@/components/redeem/RedeemToolbar";
import { SupportConfirmDialog } from "@/components/support/SupportConfirmDialog";

const PAGE_SIZE = 12;

function canAccessRedeem(): boolean {
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
      ? admin.allowedModules.includes("redeem")
      : false;
  } catch {
    return false;
  }
}

export default function RedeemPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RedeemListRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RedeemFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState(emptyRedeemForm());
  const [reveal, setReveal] = useState<{ title: string; code: string } | null>(
    null,
  );
  const [commentsFor, setCommentsFor] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [claimLogOpen, setClaimLogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RedeemListRow | null>(null);

  useEffect(() => {
    setAllowed(canAccessRedeem());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchRedeemCodes());
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : "Failed to load redeem codes.");
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

  const stats = useMemo(() => computeRedeemStats(rows), [rows]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "daily" && row.cadence !== "DAILY") return false;
      if (filter === "weekly" && row.cadence !== "WEEKLY") return false;
      if (filter === "low" && row.stockLeft !== 1) return false;
      if (filter === "paused" && row.status !== "PAUSED") return false;
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        row.valueLabel.toLowerCase().includes(q) ||
        row.codeMasked.toLowerCase().includes(q)
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

  function openAdd() {
    setFormMode("add");
    setEditingId(null);
    setFormInitial(emptyRedeemForm());
    setNotice(null);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setFormMode("edit");
    setEditingId(id);
    setFormInitial(rowToForm(row));
    setNotice(null);
    setError(null);
    setFormOpen(true);
  }

  async function saveForm(values: RedeemFormValues): Promise<string | null> {
    const body = formToApiBody(values, formMode);
    if ("error" in body) {
      return typeof body.error === "string" ? body.error : "Invalid form.";
    }
    setError(null);
    try {
      if (formMode === "edit" && editingId) {
        const saved = await updateRedeemCode(editingId, body);
        setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
        setNotice(`Updated “${saved.title}”.`);
      } else {
        const saved = await createRedeemCode(body);
        setRows((prev) => [saved, ...prev]);
        setNotice(`Added “${saved.title}”.`);
      }
      return null;
    } catch (e) {
      setNotice(null);
      return e instanceof Error ? e.message : "Save failed.";
    }
  }

  async function revealCode(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const revealed = await revealRedeemCode(id);
      const code = revealed.code?.trim() ?? "";
      if (!code) {
        setNotice(null);
        setError("Reveal returned an empty code.");
        return;
      }
      setReveal({ title: revealed.title, code });
      setNotice(`Revealed code for “${revealed.title}”.`);
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : "Reveal failed.");
    } finally {
      setBusyId(null);
    }
  }

  function requestDelete(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busyId) return;
    setError(null);
    setNotice(null);
    setDeleteTarget(row);
  }

  async function confirmDelete() {
    const row = deleteTarget;
    if (!row || busyId) return;
    setBusyId(row.id);
    setError(null);
    try {
      await deleteRedeemCode(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setNotice(`Deleted “${row.title}”.`);
      if (commentsFor?.id === row.id) setCommentsFor(null);
      setDeleteTarget(null);
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : "Delete failed.");
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  if (!allowed) {
    return (
      <p className="text-sm text-slate-500">
        You do not have access to Redeem.
      </p>
    );
  }

  const inventoryEmpty = !loading && !error && rows.length === 0;
  const filterEmpty =
    !loading && !error && rows.length > 0 && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <RedeemHeader
        onAdd={openAdd}
        onClaimLog={() => setClaimLogOpen(true)}
      />
      <RedeemStats
        active={stats.active}
        low={stats.low}
        paused={stats.paused}
        expiring={stats.expiring}
      />
      <RedeemToolbar
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-[13px] text-rose-800">{error}</p>
          <button
            type="button"
            onClick={() => {
              void load();
            }}
            className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-rose-800 hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-900">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-500">Loading redeem inventory…</p>
      ) : error && rows.length === 0 ? null : inventoryEmpty ? (
        <RedeemEmptyState kind="inventory" onAdd={openAdd} />
      ) : filterEmpty ? (
        <RedeemEmptyState
          kind="filter"
          onClearFilter={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      ) : (
        <RedeemTable
          rows={paged}
          onEdit={openEdit}
          onReveal={(id) => {
            void revealCode(id);
          }}
          onDelete={requestDelete}
          onComments={(id) => {
            const row = rows.find((r) => r.id === id);
            if (!row) return;
            setCommentsFor({ id: row.id, title: row.title });
          }}
          footer={
            <RedeemPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPage={setPage}
            />
          }
        />
      )}
      <RedeemCapabilities />
      <RedeemFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        onClose={() => setFormOpen(false)}
        onSubmit={saveForm}
      />
      <RedeemRevealModal
        open={Boolean(reveal)}
        title={reveal?.title ?? ""}
        code={reveal?.code ?? ""}
        onClose={() => setReveal(null)}
      />
      <RedeemCommentsDrawer
        open={Boolean(commentsFor)}
        codeId={commentsFor?.id ?? null}
        codeTitle={commentsFor?.title ?? ""}
        onClose={() => setCommentsFor(null)}
      />
      <RedeemClaimLogDrawer
        open={claimLogOpen}
        onClose={() => setClaimLogOpen(false)}
      />
      <SupportConfirmDialog
        open={deleteTarget != null}
        tone="danger"
        eyebrow="Redeem inventory"
        title="Delete this code?"
        description="This removes the code from live inventory. Past claims stay in the claim log."
        detail={
          deleteTarget
            ? `${deleteTarget.title} · ${deleteTarget.codeMasked}`
            : undefined
        }
        note="This cannot be undone."
        confirmLabel="Delete code"
        busyLabel="Deleting…"
        busy={busyId != null && busyId === deleteTarget?.id}
        onCancel={() => {
          if (busyId) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </section>
  );
}
