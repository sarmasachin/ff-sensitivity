"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShopEmptyState } from "@/components/shop/ShopEmptyState";
import { ShopFormModal } from "@/components/shop/ShopFormModal";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopPagination } from "@/components/shop/ShopPagination";
import { ShopStats } from "@/components/shop/ShopStats";
import { ShopTable } from "@/components/shop/ShopTable";
import {
  ShopToolbar,
  type ShopFilterKey,
} from "@/components/shop/ShopToolbar";
import {
  createShopCategory,
  createShopItem,
  deleteShopItem,
  fetchShopBundle,
  shopFormBody,
  updateShopItem,
} from "@/components/shop/shop-api";
import {
  computeShopStats,
  emptyShopForm,
  rowToForm,
  type ShopCategoryRow,
  type ShopFormValues,
  type ShopListRow,
} from "@/components/shop/shop-data";
import { SupportConfirmDialog } from "@/components/support/SupportConfirmDialog";

const PAGE_SIZE = 12;

function canAccessShop(): boolean {
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
      ? admin.allowedModules.includes("shop")
      : false;
  } catch {
    return false;
  }
}

export default function ShopPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ShopListRow[]>([]);
  const [categories, setCategories] = useState<ShopCategoryRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ShopFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState(emptyShopForm());
  const [deleteTarget, setDeleteTarget] = useState<ShopListRow | null>(null);

  useEffect(() => {
    setAllowed(canAccessShop());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchShopBundle();
      setRows(data.items);
      setCategories(data.categories);
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : "Failed to load shop items.");
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

  const stats = useMemo(() => computeShopStats(rows), [rows]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "live" && !row.enabled) return false;
      if (filter === "disabled" && row.enabled) return false;
      if (
        filter !== "all" &&
        filter !== "live" &&
        filter !== "disabled" &&
        row.category !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        row.subtitle.toLowerCase().includes(q) ||
        row.rewardTag.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q)
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
    const first = categories.find((c) => c.enabled)?.id ?? "";
    setFormMode("add");
    setEditingId(null);
    setFormInitial(emptyShopForm(first));
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

  async function saveForm(values: ShopFormValues): Promise<string | null> {
    const body = shopFormBody(values, formMode);
    if ("error" in body) {
      return typeof body.error === "string" ? body.error : "Invalid form.";
    }
    setError(null);
    try {
      if (formMode === "edit" && editingId) {
        const saved = await updateShopItem(editingId, body);
        setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
        setNotice(`Updated “${saved.title}”.`);
      } else {
        const saved = await createShopItem(body);
        setRows((prev) => [saved, ...prev]);
        setNotice(`Added “${saved.title}”.`);
      }
      return null;
    } catch (e) {
      setNotice(null);
      return e instanceof Error ? e.message : "Save failed.";
    }
  }

  async function handleCreateCategory(input: {
    id: string;
    label: string;
    isBoost: boolean;
  }): Promise<string | null> {
    try {
      const cat = await createShopCategory(input);
      setCategories((prev) => {
        if (prev.some((c) => c.id === cat.id)) return prev;
        return [...prev, cat].sort((a, b) => a.sortOrder - b.sortOrder);
      });
      setNotice(`Category “${cat.label}” added.`);
      return null;
    } catch (e) {
      setNotice(null);
      return e instanceof Error ? e.message : "Failed to add category.";
    }
  }

  async function toggleEnabled(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const saved = await updateShopItem(id, { enabled: !row.enabled });
      setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      setNotice(
        saved.enabled ? `Enabled “${saved.title}”.` : `Disabled “${saved.title}”.`,
      );
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : "Update failed.");
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
      await deleteShopItem(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setNotice(`Deleted “${row.title}”.`);
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
      <p className="text-sm text-slate-500">You do not have access to Shop.</p>
    );
  }

  const inventoryEmpty = !loading && !error && rows.length === 0;
  const filterEmpty =
    !loading && !error && rows.length > 0 && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <ShopHeader onAdd={openAdd} />
      <ShopStats
        live={stats.live}
        disabled={stats.disabled}
        oneTime={stats.oneTime}
        limited={stats.limited}
      />
      <ShopToolbar
        query={query}
        filter={filter}
        categories={categories.filter((c) => c.enabled)}
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
        <p className="text-sm text-slate-500">Loading shop catalog…</p>
      ) : error && rows.length === 0 ? null : inventoryEmpty ? (
        <ShopEmptyState kind="inventory" onAdd={openAdd} />
      ) : filterEmpty ? (
        <ShopEmptyState
          kind="filter"
          onClearFilter={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      ) : (
        <ShopTable
          rows={paged}
          notice={null}
          onEdit={openEdit}
          onDelete={requestDelete}
          onToggle={(id) => {
            void toggleEnabled(id);
          }}
          footer={
            <ShopPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPage={setPage}
            />
          }
        />
      )}
      <ShopFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSubmit={saveForm}
        onCreateCategory={handleCreateCategory}
      />
      <SupportConfirmDialog
        open={deleteTarget != null}
        tone="danger"
        eyebrow="Shop catalog"
        title="Delete this item?"
        description="This removes the item from the live catalog. Purchases already made stay in wallet history."
        detail={
          deleteTarget
            ? `${deleteTarget.title} · ${deleteTarget.id}`
            : undefined
        }
        note="This cannot be undone."
        confirmLabel="Delete item"
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
