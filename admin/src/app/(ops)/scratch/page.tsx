"use client";

import { useEffect, useMemo, useState } from "react";
import { ScratchCapabilities } from "@/components/scratch/ScratchCapabilities";
import { ScratchEmptyState } from "@/components/scratch/ScratchEmptyState";
import { ScratchFormModal } from "@/components/scratch/ScratchFormModal";
import { ScratchHeader } from "@/components/scratch/ScratchHeader";
import { ScratchOutcomeOddsCard } from "@/components/scratch/ScratchOutcomeOddsCard";
import { ScratchPagination } from "@/components/scratch/ScratchPagination";
import { ScratchPolicyCard } from "@/components/scratch/ScratchPolicyCard";
import { ScratchStats } from "@/components/scratch/ScratchStats";
import { ScratchTable } from "@/components/scratch/ScratchTable";
import {
  ScratchTabs,
  type ScratchTabId,
} from "@/components/scratch/ScratchTabs";
import {
  ScratchToolbar,
  type ScratchFilterKey,
} from "@/components/scratch/ScratchToolbar";
import {
  SCRATCH_DEFAULT_OUTCOME_ODDS,
  SCRATCH_DEFAULT_POLICY,
  SCRATCH_DEMO_ROWS,
  computeScratchStats,
  emptyScratchForm,
  formToRow,
  rowToForm,
  type ScratchFormValues,
  type ScratchOutcomeOdds,
  type ScratchPolicy,
  type ScratchPrizeRow,
} from "@/components/scratch/scratch-data";

const PAGE_SIZE = 5;

export default function ScratchPage() {
  const [tab, setTab] = useState<ScratchTabId>("odds");
  const [rows, setRows] = useState<ScratchPrizeRow[]>(() => [
    ...SCRATCH_DEMO_ROWS,
  ]);
  const [policy, setPolicy] = useState<ScratchPolicy>(SCRATCH_DEFAULT_POLICY);
  const [outcomeOdds, setOutcomeOdds] = useState<ScratchOutcomeOdds>(
    SCRATCH_DEFAULT_OUTCOME_ODDS,
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ScratchFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState(emptyScratchForm());

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const stats = useMemo(() => computeScratchStats(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "live" && !row.enabled) return false;
      if (filter === "disabled" && row.enabled) return false;
      if (
        filter !== "all" &&
        filter !== "live" &&
        filter !== "disabled" &&
        row.kind !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        row.detail.toLowerCase().includes(q) ||
        row.rewardLabel.toLowerCase().includes(q) ||
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
    setTab("prizes");
    setFormMode("add");
    setEditingId(null);
    setFormInitial(emptyScratchForm());
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

  function saveForm(values: ScratchFormValues): string | null {
    if (formMode === "add") {
      const id = values.id.trim() || `prize_${Date.now()}`;
      if (rows.some((r) => r.id === id)) {
        return "A prize with this ID already exists.";
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

  function deletePrize(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (!window.confirm(`Delete “${row.title}”? This cannot be undone.`)) {
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setNotice(`Deleted “${row.title}”.`);
  }

  function updatePolicy(next: ScratchPolicy) {
    setPolicy(next);
    setNotice(
      `History policy → ${next.retentionDays}d retention` +
        (next.autoPurge ? ", auto-purge on" : ", auto-purge off"),
    );
  }

  function saveOutcomeOdds(next: ScratchOutcomeOdds) {
    setOutcomeOdds(next);
    setNotice(
      `Outcome odds saved — Coins ${next.coinsPercent}% · Redeem ${next.redeemPercent}%`,
    );
  }

  const inventoryEmpty = rows.length === 0;
  const filterEmpty = !inventoryEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <ScratchHeader />
      <ScratchStats
        live={stats.live}
        gifts={stats.gifts}
        milestones={stats.milestones}
        oddsSum={stats.oddsSum}
      />
      <ScratchTabs active={tab} onChange={setTab} />

      {tab === "odds" ? (
        <ScratchOutcomeOddsCard odds={outcomeOdds} onSave={saveOutcomeOdds} />
      ) : null}

      {tab === "history" ? (
        <ScratchPolicyCard policy={policy} onChange={updatePolicy} />
      ) : null}

      {tab === "prizes" ? (
        <>
          <ScratchToolbar
            query={query}
            filter={filter}
            onQuery={setQuery}
            onFilter={setFilter}
            onAdd={openAdd}
          />

          {inventoryEmpty ? (
            <ScratchEmptyState kind="inventory" onAdd={openAdd} />
          ) : filterEmpty ? (
            <ScratchEmptyState
              kind="filter"
              onClearFilter={() => {
                setFilter("all");
                setQuery("");
              }}
            />
          ) : (
            <ScratchTable
              rows={paged}
              notice={notice}
              onEdit={openEdit}
              onDelete={deletePrize}
              onToggle={toggleEnabled}
              footer={
                <ScratchPagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={filtered.length}
                  onPage={setPage}
                />
              }
            />
          )}

          <ScratchCapabilities />
        </>
      ) : null}

      <ScratchFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        onClose={() => setFormOpen(false)}
        onSubmit={saveForm}
      />
    </section>
  );
}
