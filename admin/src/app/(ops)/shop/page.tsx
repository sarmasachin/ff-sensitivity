"use client";

import { useEffect, useMemo, useState } from "react";
import { ShopCapabilities } from "@/components/shop/ShopCapabilities";
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
  SHOP_DEMO_ROWS,
  computeShopStats,
  emptyShopForm,
  formToRow,
  rowToForm,
  type ShopFormValues,
  type ShopListRow,
} from "@/components/shop/shop-data";

const PAGE_SIZE = 5;

export default function ShopPage() {
  const [rows, setRows] = useState<ShopListRow[]>(() => [...SHOP_DEMO_ROWS]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ShopFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState(emptyShopForm());

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
    setFormMode("add");
    setEditingId(null);
    setFormInitial(emptyShopForm());
    setFormOpen(true);
  }

  function openEdit(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setFormMode("edit");
    setEditingId(id);
    setFormInitial(rowToForm(row));
    setFormOpen(true);
  }

  function saveForm(values: ShopFormValues): string | null {
    if (formMode === "add") {
      const id = values.id.trim() || `item_${Date.now()}`;
      if (rows.some((r) => r.id === id)) {
        return "An item with this ID already exists.";
      }
      const result = formToRow(values, id);
      if ("error" in result) return result.error;
      setRows((prev) => [result, ...prev]);
      setNotice(`Added “${result.title}”.`);
      return null;
    }

    if (!editingId) return "Nothing to edit.";
    const result = formToRow({ ...values, id: editingId }, editingId);
    if ("error" in result) return result.error;
    setRows((prev) => prev.map((r) => (r.id === editingId ? result : r)));
    setNotice(`Updated “${result.title}”.`);
    return null;
  }

  function toggleEnabled(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const enabled = !row.enabled;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r)),
    );
    setNotice(enabled ? `Enabled “${row.title}”.` : `Disabled “${row.title}”.`);
  }

  function deleteItem(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (!window.confirm(`Delete “${row.title}”? This cannot be undone.`)) {
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setNotice(`Deleted “${row.title}”.`);
  }

  const inventoryEmpty = rows.length === 0;
  const filterEmpty = !inventoryEmpty && filtered.length === 0;

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
        onQuery={setQuery}
        onFilter={setFilter}
      />

      {inventoryEmpty ? (
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
          notice={notice}
          onEdit={openEdit}
          onDelete={deleteItem}
          onToggle={toggleEnabled}
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

      <ShopCapabilities />

      <ShopFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        onClose={() => setFormOpen(false)}
        onSubmit={saveForm}
      />
    </section>
  );
}
