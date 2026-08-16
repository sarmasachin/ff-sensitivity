"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PromosCapabilities } from "@/components/promos/PromosCapabilities";
import { PromosEmptyState } from "@/components/promos/PromosEmptyState";
import { PromosFormModal } from "@/components/promos/PromosFormModal";
import { PromosHeader } from "@/components/promos/PromosHeader";
import { PromosPagination } from "@/components/promos/PromosPagination";
import { PromosStats } from "@/components/promos/PromosStats";
import { PromosTable } from "@/components/promos/PromosTable";
import {
  PromosToolbar,
  type PromosFilterKey,
} from "@/components/promos/PromosToolbar";
import { canAccessPromos, sortByOrder } from "@/components/promos/promo-access";
import { fetchPromos } from "@/components/promos/promo-api";
import {
  computePromoStats,
  emptyPromoForm,
  isEndingSoon,
  promoToForm,
  resolvePromoStatus,
  type PromoFormValues,
  type PromoRow,
} from "@/components/promos/promo-data";
import {
  deletePromoRow,
  movePromoRow,
  persistPromo,
  togglePromoRow,
} from "@/components/promos/promo-page-mutations";
import { PROMOS_TOAST_TITLES } from "@/components/promos/promo-toast";
import { RedeemToastHost } from "@/components/redeem/RedeemToastHost";
import { useRedeemToasts } from "@/components/redeem/useRedeemToasts";

const PAGE_SIZE = 12;
const MAX_PROMOS = 40;

export default function PromosPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PromosFilterKey>("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<PromoFormValues>(() =>
    emptyPromoForm(1),
  );
  const [retryToastId, setRetryToastId] = useState<string | null>(null);
  const { toasts, push, dismiss } = useRedeemToasts();

  const stats = useMemo(() => computePromoStats(rows), [rows]);

  useEffect(() => {
    setAllowed(canAccessPromos());
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      setRows(sortByOrder(await fetchPromos()));
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load promos.";
      const id = push("error", PROMOS_TOAST_TITLES.loadError, message, {
        actionLabel: "Retry",
        durationMs: 0,
      });
      setRetryToastId(id);
      return false;
    } finally {
      setLoading(false);
    }
  }, [push]);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortByOrder(rows).filter((row) => {
      const status = resolvePromoStatus(row);
      if (filter === "live" && status !== "LIVE") return false;
      if (filter === "scheduled" && status !== "SCHEDULED") return false;
      if (filter === "off" && status !== "OFF") return false;
      if (filter === "ending" && !isEndingSoon(row)) return false;
      if (filter === "banner" && row.placement !== "HOME_BANNER") return false;
      if (filter === "strip" && row.placement !== "HOME_STRIP") return false;
      if (!q) return true;
      const hay = [
        row.id,
        row.title,
        row.subtitle,
        row.deepLink,
        row.imageLabel,
        row.placement,
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

  function openAdd() {
    if (rows.length >= MAX_PROMOS) {
      push("error", PROMOS_TOAST_TITLES.error, "Promo table is full (max 40).");
      return;
    }
    setFormMode("add");
    setEditingId(null);
    setFormInitial(emptyPromoForm(rows.length + 1));
    setFormOpen(true);
  }

  function openEdit(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setFormMode("edit");
    setEditingId(id);
    setFormInitial(promoToForm(row));
    setFormOpen(true);
  }

  async function saveForm(values: PromoFormValues): Promise<string | null> {
    return persistPromo(values, formMode, rows, editingId, setRows, push);
  }

  async function runBusy(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
        <h1 className="text-[17px] font-bold text-rose-950">No Promos access</h1>
        <p className="mt-2 text-[13px] text-rose-800">
          Your staff role is missing the <code>promos</code> module.
        </p>
      </section>
    );
  }

  const queueEmpty = !loading && rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <PromosHeader
        busy={loading || busy}
        onAdd={openAdd}
        onRefresh={() =>
          void load({ silent: true }).then((ok) => {
            if (ok) {
              push(
                "success",
                PROMOS_TOAST_TITLES.success,
                "Promos refreshed from Nest.",
              );
            }
          })
        }
      />
      <PromosStats
        total={stats.total}
        live={stats.live}
        scheduled={stats.scheduled}
        off={stats.off}
        endingSoon={stats.endingSoon}
      />

      {loading ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-400">
          Loading promos…
        </p>
      ) : null}

      {!loading ? (
        <>
          <PromosToolbar
            query={query}
            filter={filter}
            onQuery={setQuery}
            onFilter={setFilter}
          />
          {queueEmpty ? (
            <PromosEmptyState
              title="No promos yet"
              body="Add a home banner or strip with title, deep link, and schedule."
            />
          ) : filterEmpty ? (
            <PromosEmptyState
              title="No matches"
              body="Try another search or filter."
            />
          ) : (
            <>
              <PromosTable
                rows={paged}
                busy={busy}
                onEdit={openEdit}
                onToggle={(id) => {
                  void runBusy(() => togglePromoRow(id, rows, setRows, push));
                }}
                onDelete={(id) => {
                  void runBusy(() => deletePromoRow(id, rows, setRows, push));
                }}
                onMove={(id, dir) => {
                  void runBusy(() => movePromoRow(id, dir, rows, setRows, push));
                }}
              />
              <PromosPagination
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPage={setPage}
              />
            </>
          )}
          <PromosCapabilities />
        </>
      ) : null}

      <PromosFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        onClose={() => setFormOpen(false)}
        onSave={saveForm}
      />
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
