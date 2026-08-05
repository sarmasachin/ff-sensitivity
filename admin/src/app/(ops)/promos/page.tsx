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
import { fetchPromos, savePromos } from "@/components/promos/promo-api";
import {
  computePromoStats,
  emptyPromoForm,
  isEndingSoon,
  promoToForm,
  resolvePromoStatus,
  type PromoFormValues,
  type PromoRow,
} from "@/components/promos/promo-data";

const PAGE_SIZE = 12;

function sortByOrder(rows: PromoRow[]): PromoRow[] {
  return [...rows].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
  );
}

function reindexOrders(rows: PromoRow[]): PromoRow[] {
  return sortByOrder(rows).map((row, i) => ({ ...row, sortOrder: i + 1 }));
}

function snapKey(rows: PromoRow[]) {
  return JSON.stringify(rows);
}

function canAccessPromos(): boolean {
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
      ? admin.allowedModules.includes("promos")
      : false;
  } catch {
    return false;
  }
}

export default function PromosPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [savedKey, setSavedKey] = useState("[]");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PromosFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<PromoFormValues>(() =>
    emptyPromoForm(1),
  );

  const dirty = snapKey(rows) !== savedKey;
  const stats = useMemo(() => computePromoStats(rows), [rows]);

  useEffect(() => {
    setAllowed(canAccessPromos());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const promos = reindexOrders(await fetchPromos());
      setRows(promos);
      setSavedKey(snapKey(promos));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load promos.");
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

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = reindexOrders(await savePromos(reindexOrders(rows)));
      setRows(saved);
      setSavedKey(snapKey(saved));
      setNotice("Promos saved live — Android home syncs on next open.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
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

  function savePromo(row: PromoRow) {
    if (formMode === "add") {
      if (rows.some((r) => r.id === row.id)) {
        setNotice(`Promo id “${row.id}” already exists.`);
        return;
      }
      setRows((prev) => reindexOrders([row, ...prev]));
      setNotice(`Added promo “${row.title}”. Save to push live.`);
      return;
    }
    if (!editingId) return;
    setRows((prev) =>
      reindexOrders(
        prev.map((r) => (r.id === editingId ? { ...row, id: editingId } : r)),
      ),
    );
    setNotice(`Updated promo “${row.title}”. Save to push live.`);
  }

  function togglePromo(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );
    setNotice(
      `${row.enabled ? "Disabled" : "Enabled"} promo “${row.title}”. Save to push.`,
    );
  }

  function deletePromo(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (!window.confirm(`Delete promo “${row.title}”?`)) return;
    setRows((prev) => reindexOrders(prev.filter((r) => r.id !== id)));
    setNotice(`Deleted promo “${row.title}”. Save to push live.`);
  }

  function movePromo(id: string, dir: -1 | 1) {
    setRows((prev) => {
      const ordered = sortByOrder(prev);
      const idx = ordered.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const swap = idx + dir;
      if (swap < 0 || swap >= ordered.length) return prev;
      const next = [...ordered];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next.map((row, i) => ({ ...row, sortOrder: i + 1 }));
    });
    setNotice("Promo order updated. Save to push live.");
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
        dirty={dirty}
        saving={saving}
        onAdd={openAdd}
        onSave={() => void handleSave()}
        onReset={() => void load().then(() => setNotice("Reverted to server."))}
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
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] font-medium text-amber-950"
        >
          {notice}
        </div>
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
                onEdit={openEdit}
                onToggle={togglePromo}
                onDelete={deletePromo}
                onMove={movePromo}
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
        onSave={savePromo}
      />
    </section>
  );
}
