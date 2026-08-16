"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScratchFormModal } from "@/components/scratch/ScratchFormModal";
import { ScratchHeader } from "@/components/scratch/ScratchHeader";
import { ScratchOutcomeOddsCard } from "@/components/scratch/ScratchOutcomeOddsCard";
import { ScratchPolicyCard } from "@/components/scratch/ScratchPolicyCard";
import { ScratchPrizesSection } from "@/components/scratch/ScratchPrizesSection";
import { ScratchStats } from "@/components/scratch/ScratchStats";
import {
  ScratchTabs,
  type ScratchTabId,
} from "@/components/scratch/ScratchTabs";
import type { ScratchFilterKey } from "@/components/scratch/ScratchToolbar";
import {
  canAccessScratch,
  snapshotScratchKey,
} from "@/components/scratch/scratch-access";
import {
  fetchScratchBundle,
  saveScratchBundle,
} from "@/components/scratch/scratch-api";
import {
  persistPrize,
  deletePrizeRow,
  togglePrizeRow,
} from "@/components/scratch/scratch-page-mutations";
import {
  SCRATCH_DEFAULT_OUTCOME_ODDS,
  SCRATCH_DEFAULT_POLICY,
  computeScratchStats,
  emptyScratchForm,
  rowToForm,
  validateOutcomeOdds,
  type ScratchFormValues,
  type ScratchOutcomeOdds,
  type ScratchPolicy,
  type ScratchPrizeRow,
} from "@/components/scratch/scratch-data";
import { SCRATCH_TOAST_TITLES } from "@/components/scratch/scratch-toast";
import { RedeemToastHost } from "@/components/redeem/RedeemToastHost";
import { useRedeemToasts } from "@/components/redeem/useRedeemToasts";

const PAGE_SIZE = 12;

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
    snapshotScratchKey(SCRATCH_DEFAULT_OUTCOME_ODDS, SCRATCH_DEFAULT_POLICY),
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ScratchFilterKey>("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState(emptyScratchForm());
  const [retryToastId, setRetryToastId] = useState<string | null>(null);
  const { toasts, push, dismiss } = useRedeemToasts();

  const dirty = snapshotScratchKey(outcomeOdds, policy) !== savedKey;
  const stats = useMemo(() => computeScratchStats(rows), [rows]);

  useEffect(() => {
    setAllowed(canAccessScratch());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bundle = await fetchScratchBundle();
      setOutcomeOdds(bundle.outcomeOdds);
      setPolicy(bundle.policy);
      setRows(bundle.prizes);
      setSavedKey(snapshotScratchKey(bundle.outcomeOdds, bundle.policy));
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load scratch.";
      const id = push("error", SCRATCH_TOAST_TITLES.loadError, message, {
        actionLabel: "Retry",
        durationMs: 0,
      });
      setRetryToastId(id);
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
      push("error", SCRATCH_TOAST_TITLES.error, oddsErr);
      return;
    }
    setSaving(true);
    try {
      const saved = await saveScratchBundle({ outcomeOdds, policy });
      setOutcomeOdds(saved.outcomeOdds);
      setPolicy(saved.policy);
      setRows(saved.prizes);
      setSavedKey(snapshotScratchKey(saved.outcomeOdds, saved.policy));
      push(
        "success",
        SCRATCH_TOAST_TITLES.success,
        "Odds & policy live — Android syncs on next open.",
      );
    } catch (e) {
      push(
        "error",
        SCRATCH_TOAST_TITLES.error,
        e instanceof Error ? e.message : "Save failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    if (rows.length >= 200) {
      push("error", SCRATCH_TOAST_TITLES.error, "Prize table is full (max 200).");
      return;
    }
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

  async function saveForm(values: ScratchFormValues): Promise<string | null> {
    return persistPrize(values, formMode, rows, editingId, setRows, push);
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
        onReset={() => {
          void load().then(() =>
            push("success", SCRATCH_TOAST_TITLES.success, "Reverted to last saved odds & policy."),
          );
        }}
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
          Loading live scratch config…
        </p>
      ) : null}
      {!loading && tab === "odds" ? (
        <ScratchOutcomeOddsCard
          odds={outcomeOdds}
          onSave={(next) => setOutcomeOdds(next)}
        />
      ) : null}
      {!loading && tab === "history" ? (
        <ScratchPolicyCard policy={policy} onChange={setPolicy} />
      ) : null}
      {!loading && tab === "prizes" ? (
        <ScratchPrizesSection
          query={query}
          filter={filter}
          page={page}
          pageSize={PAGE_SIZE}
          rows={rows}
          filtered={filtered}
          paged={paged}
          onQuery={setQuery}
          onFilter={setFilter}
          onPage={setPage}
          onAdd={openAdd}
          onEdit={openEdit}
          onToggle={(id) => {
            void togglePrizeRow(id, rows, setRows, push);
          }}
          onDelete={(id) => {
            void deletePrizeRow(id, rows, setRows, push);
          }}
        />
      ) : null}
      <ScratchFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        onClose={() => setFormOpen(false)}
        onSubmit={saveForm}
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
