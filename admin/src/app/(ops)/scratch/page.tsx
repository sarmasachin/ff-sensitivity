"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  fetchScratchBundle,
  saveScratchBundle,
} from "@/components/scratch/scratch-api";
import {
  SCRATCH_DEFAULT_OUTCOME_ODDS,
  SCRATCH_DEFAULT_POLICY,
  computeScratchStats,
  emptyScratchForm,
  formToRow,
  rowToForm,
  validateOutcomeOdds,
  type ScratchFormValues,
  type ScratchOutcomeOdds,
  type ScratchPolicy,
  type ScratchPrizeRow,
} from "@/components/scratch/scratch-data";

const PAGE_SIZE = 12;

function snapKey(
  odds: ScratchOutcomeOdds,
  policy: ScratchPolicy,
  prizes: ScratchPrizeRow[],
) {
  return JSON.stringify({ odds, policy, prizes });
}

function canAccessScratch(): boolean {
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
      ? admin.allowedModules.includes("scratch")
      : false;
  } catch {
    return false;
  }
}

export default function ScratchPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<ScratchTabId>("odds");
  const [rows, setRows] = useState<ScratchPrizeRow[]>([]);
  const [policy, setPolicy] = useState<ScratchPolicy>(SCRATCH_DEFAULT_POLICY);
  const [outcomeOdds, setOutcomeOdds] = useState<ScratchOutcomeOdds>(
    SCRATCH_DEFAULT_OUTCOME_ODDS,
  );
  const [savedKey, setSavedKey] = useState(() =>
    snapKey(SCRATCH_DEFAULT_OUTCOME_ODDS, SCRATCH_DEFAULT_POLICY, []),
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ScratchFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState(emptyScratchForm());

  const dirty = snapKey(outcomeOdds, policy, rows) !== savedKey;
  const stats = useMemo(() => computeScratchStats(rows), [rows]);

  useEffect(() => {
    setAllowed(canAccessScratch());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bundle = await fetchScratchBundle();
      setOutcomeOdds(bundle.outcomeOdds);
      setPolicy(bundle.policy);
      setRows(bundle.prizes);
      setSavedKey(
        snapKey(bundle.outcomeOdds, bundle.policy, bundle.prizes),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scratch.");
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

  async function handleSave() {
    const oddsErr = validateOutcomeOdds(outcomeOdds);
    if (oddsErr) {
      setError(oddsErr);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveScratchBundle({
        outcomeOdds,
        policy,
        prizes: rows,
      });
      setOutcomeOdds(saved.outcomeOdds);
      setPolicy(saved.policy);
      setRows(saved.prizes);
      setSavedKey(snapKey(saved.outcomeOdds, saved.policy, saved.prizes));
      setNotice("Scratch config saved live — Android syncs on next open.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

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
      setNotice(`Added “${result.title}”. Save to push live.`);
      return null;
    }
    if (!editingId) return "Nothing to edit.";
    const result = formToRow({ ...values, id: editingId }, editingId);
    if ("error" in result) return result.error;
    setRows((prev) => prev.map((r) => (r.id === editingId ? result : r)));
    setNotice(`Updated “${result.title}”. Save to push live.`);
    return null;
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
        <h1 className="text-[17px] font-bold text-rose-950">No Scratch access</h1>
        <p className="mt-2 text-[13px] text-rose-800">
          Your staff role is missing the <code>scratch</code> module.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <ScratchHeader
        dirty={dirty}
        saving={saving}
        onSave={() => void handleSave()}
        onReset={() => void load().then(() => setNotice("Reverted to server."))}
      />
      <ScratchStats
        live={stats.live}
        gifts={stats.gifts}
        milestones={stats.milestones}
        oddsSum={stats.oddsSum}
      />
      <ScratchTabs active={tab} onChange={setTab} />

      {loading ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-400">
          Loading scratch config…
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
          className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-[13px] font-medium text-violet-950"
        >
          {notice}
        </div>
      ) : null}

      {!loading && tab === "odds" ? (
        <ScratchOutcomeOddsCard
          odds={outcomeOdds}
          onSave={(next) => {
            setOutcomeOdds(next);
            setNotice(
              `Odds draft — Coins ${next.coinsPercent}% · Redeem ${next.redeemPercent}%. Save to push.`,
            );
          }}
        />
      ) : null}

      {!loading && tab === "history" ? (
        <ScratchPolicyCard
          policy={policy}
          onChange={(next) => {
            setPolicy(next);
            setNotice(
              `Policy draft → ${next.retentionDays}d. Save to push live.`,
            );
          }}
        />
      ) : null}

      {!loading && tab === "prizes" ? (
        <>
          <ScratchToolbar
            query={query}
            filter={filter}
            onQuery={setQuery}
            onFilter={setFilter}
            onAdd={openAdd}
          />
          {rows.length === 0 ? (
            <ScratchEmptyState kind="inventory" onAdd={openAdd} />
          ) : filtered.length === 0 ? (
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
              notice={null}
              onEdit={openEdit}
              onDelete={(id) => {
                const row = rows.find((r) => r.id === id);
                if (!row) return;
                if (!window.confirm(`Delete “${row.title}”?`)) return;
                setRows((prev) => prev.filter((r) => r.id !== id));
                setNotice(`Deleted “${row.title}”. Save to push live.`);
              }}
              onToggle={(id) => {
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === id ? { ...r, enabled: !r.enabled } : r,
                  ),
                );
                setNotice("Prize status updated. Save to push live.");
              }}
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
