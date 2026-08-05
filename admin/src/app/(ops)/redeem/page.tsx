"use client";

import { useEffect, useMemo, useState } from "react";
import { RedeemCapabilities } from "@/components/redeem/RedeemCapabilities";
import { RedeemClaimLogDrawer } from "@/components/redeem/RedeemClaimLogDrawer";
import { RedeemCommentsDrawer } from "@/components/redeem/RedeemCommentsDrawer";
import { RedeemEmptyState } from "@/components/redeem/RedeemEmptyState";
import {
  REDEEM_DEMO_ROWS,
  computeRedeemStats,
  emptyRedeemForm,
  formToRow,
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

const PAGE_SIZE = 12;

export default function RedeemPage() {
  const [rows, setRows] = useState<RedeemListRow[]>(() => [...REDEEM_DEMO_ROWS]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RedeemFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
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

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const stats = useMemo(() => computeRedeemStats(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "daily" && row.cadence !== "DAILY") return false;
      if (filter === "weekly" && row.cadence !== "WEEKLY") return false;
      if (filter === "low" && !(row.stockLeft > 0 && row.stockLeft <= 2)) {
        return false;
      }
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

  function saveForm(values: RedeemFormValues): string | null {
    const id =
      formMode === "edit" && editingId ? editingId : `local-${Date.now()}`;
    const result = formToRow(values, id);
    if ("error" in result) return result.error;

    if (formMode === "edit") {
      setRows((prev) => prev.map((r) => (r.id === id ? result : r)));
      setNotice(`Updated “${result.title}”.`);
    } else {
      setRows((prev) => [result, ...prev]);
      setNotice(`Added “${result.title}”.`);
    }
    return null;
  }

  function revealCode(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setReveal({ title: row.title, code: row.codeSecret });
    setNotice(`Revealed code for “${row.title}”.`);
  }

  function deleteCode(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const ok = window.confirm(`Delete “${row.title}”? This cannot be undone.`);
    if (!ok) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setNotice(`Deleted “${row.title}”.`);
    if (commentsFor?.id === id) setCommentsFor(null);
  }

  const inventoryEmpty = rows.length === 0;
  const filterEmpty = !inventoryEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <RedeemHeader
        onAdd={openAdd}
        onImport={() =>
          setNotice("CSV import will work after Redeem API is connected.")
        }
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

      {inventoryEmpty ? (
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
          notice={notice}
          onEdit={openEdit}
          onReveal={revealCode}
          onDelete={deleteCode}
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
    </section>
  );
}
