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
  addRedeemCadenceDef,
  addRedeemTypeDef,
} from "@/components/redeem/redeem-page-defs";
import {
  computeRedeemStats,
  emptyRedeemForm,
  rowToForm,
  type RedeemCadenceRow,
  type RedeemFormValues,
  type RedeemListRow,
  type RedeemTypeRow,
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
import { RedeemToastHost } from "@/components/redeem/RedeemToastHost";
import { useRedeemToasts } from "@/components/redeem/useRedeemToasts";
import { REDEEM_TOAST_TITLES } from "@/components/redeem/redeem-toast";
import {
  REDEEM_PAGE_SIZE,
  canAccessRedeem,
} from "@/components/redeem/redeem-page-access";

export default function RedeemPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RedeemListRow[]>([]);
  const [types, setTypes] = useState<RedeemTypeRow[]>([]);
  const [cadences, setCadences] = useState<RedeemCadenceRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RedeemFilterKey>("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [retryToastId, setRetryToastId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState(emptyRedeemForm());
  const [reveal, setReveal] = useState<{ title: string; code: string } | null>(null);
  const [commentsFor, setCommentsFor] = useState<{ id: string; title: string } | null>(null);
  const [claimLogOpen, setClaimLogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RedeemListRow | null>(null);
  const { toasts, push, dismiss, clear } = useRedeemToasts();

  useEffect(() => {
    setAllowed(canAccessRedeem());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRedeemCodes();
      setRows(data.codes);
      setTypes(data.types);
      setCadences(data.cadences);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load redeem codes.";
      setError(message);
      const id = push("error", REDEEM_TOAST_TITLES.loadError, message, {
        actionLabel: "Retry",
        durationMs: 0,
      });
      setRetryToastId(id);
    } finally {
      setLoading(false);
    }
  }, [push]);

  function openAdd() {
    setFormMode("add");
    setEditingId(null);
    const firstType = types.find((t) => t.enabled)?.id ?? "GOOGLE_PLAY";
    const firstCadence = cadences.find((c) => c.enabled)?.id ?? "DAILY";
    setFormInitial({
      ...emptyRedeemForm(),
      type: firstType,
      cadence: firstCadence,
    });
    clear();
    setFormOpen(true);
  }

  async function handleCreateType(input: {
    id: string;
    label: string;
  }): Promise<string | null> {
    return addRedeemTypeDef(input, setTypes, push);
  }

  async function handleCreateCadence(input: {
    id: string;
    label: string;
    claimLimit?: number;
    windowHours?: number;
  }): Promise<string | null> {
    return addRedeemCadenceDef(input, setCadences, push);
  }

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
  const totalPages = Math.max(1, Math.ceil(filtered.length / REDEEM_PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * REDEEM_PAGE_SIZE;
    return filtered.slice(start, start + REDEEM_PAGE_SIZE);
  }, [filtered, page]);

  function openEdit(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setFormMode("edit");
    setEditingId(id);
    setFormInitial(rowToForm(row));
    clear();
    setFormOpen(true);
  }

  async function saveForm(values: RedeemFormValues): Promise<string | null> {
    const body = formToApiBody(values, formMode);
    if ("error" in body) {
      return typeof body.error === "string" ? body.error : "Invalid form.";
    }
    try {
      if (formMode === "edit" && editingId) {
        const saved = await updateRedeemCode(editingId, body);
        setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
        push("success", REDEEM_TOAST_TITLES.updated, `“${saved.title}” saved.`);
      } else {
        const saved = await createRedeemCode(body);
        setRows((prev) => [saved, ...prev]);
        push("success", REDEEM_TOAST_TITLES.added, `“${saved.title}” is live.`);
      }
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Save failed.";
    }
  }

  async function revealCode(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busyId) return;
    setBusyId(id);
    try {
      const revealed = await revealRedeemCode(id);
      const code =
        revealed.code?.trim() ||
        revealed.unusedPreview?.[0]?.code?.trim() ||
        "";
      if (!code) {
        push(
          "caution",
          REDEEM_TOAST_TITLES.caution,
          revealed.unusedPreview?.length
            ? "Pool preview empty — add codes first."
            : "Reveal returned an empty code.",
        );
        return;
      }
      const title =
        revealed.unusedPreview?.length && !revealed.code
          ? `${revealed.title} (pool sample)`
          : revealed.title;
      setReveal({ title, code });
      push(
        "success",
        REDEEM_TOAST_TITLES.revealed,
        `Code for “${revealed.title}” is ready.`,
      );
    } catch (e) {
      push(
        "error",
        REDEEM_TOAST_TITLES.error,
        e instanceof Error ? e.message : "Reveal failed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function requestDelete(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busyId) return;
    clear();
    setDeleteTarget(row);
  }

  async function confirmDelete() {
    const row = deleteTarget;
    if (!row || busyId) return;
    setBusyId(row.id);
    try {
      await deleteRedeemCode(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      push("success", REDEEM_TOAST_TITLES.deleted, `“${row.title}” removed.`);
      if (commentsFor?.id === row.id) setCommentsFor(null);
      setDeleteTarget(null);
    } catch (e) {
      push(
        "error",
        REDEEM_TOAST_TITLES.error,
        e instanceof Error ? e.message : "Delete failed.",
      );
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
          types={types}
          cadences={cadences}
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
              pageSize={REDEEM_PAGE_SIZE}
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
        types={types}
        cadences={cadences}
        onClose={() => setFormOpen(false)}
        onSubmit={saveForm}
        onCreateType={handleCreateType}
        onCreateCadence={handleCreateCadence}
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
      <RedeemToastHost
        toasts={toasts}
        onDismiss={(id) => {
          dismiss(id);
          if (id === retryToastId) setRetryToastId(null);
        }}
        onAction={(id) => {
          if (id !== retryToastId) return;
          dismiss(id);
          setRetryToastId(null);
          void load();
        }}
      />
    </section>
  );
}
