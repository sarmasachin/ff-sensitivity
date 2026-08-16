"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NamesCapabilities } from "@/components/names/NamesCapabilities";
import { NamesEmptyState } from "@/components/names/NamesEmptyState";
import { NamesFontsTable } from "@/components/names/NamesFontsTable";
import { NamesFrameFormModal } from "@/components/names/NamesFrameFormModal";
import { NamesFramesSection } from "@/components/names/NamesFramesSection";
import { NamesHeader } from "@/components/names/NamesHeader";
import { NamesPolicyCard } from "@/components/names/NamesPolicyCard";
import { NamesStats } from "@/components/names/NamesStats";
import { NamesTabs } from "@/components/names/NamesTabs";
import type { NamesFilterKey } from "@/components/names/NamesToolbar";
import {
  canAccessNames,
  snapshotNamesPolicy,
} from "@/components/names/names-access";
import {
  fetchNamesBundle,
  saveNamesBundle,
} from "@/components/names/names-api";
import {
  persistFrame,
  deleteFrameRow,
  toggleFontRow,
  toggleFrameRow,
} from "@/components/names/names-page-mutations";
import {
  NAMES_DEFAULT_POLICY,
  computeNamesStats,
  emptyFrameForm,
  frameToForm,
  type NameFontRow,
  type NameFrameFormValues,
  type NameFrameRow,
  type NamesPolicy,
  type NamesTabId,
} from "@/components/names/names-data";
import { NAMES_TOAST_TITLES } from "@/components/names/names-toast";
import { RedeemToastHost } from "@/components/redeem/RedeemToastHost";
import { useRedeemToasts } from "@/components/redeem/useRedeemToasts";

const PAGE_SIZE = 12;

export default function NamesPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<NamesTabId>("frames");
  const [frames, setFrames] = useState<NameFrameRow[]>([]);
  const [fonts, setFonts] = useState<NameFontRow[]>([]);
  const [policy, setPolicy] = useState<NamesPolicy>(NAMES_DEFAULT_POLICY);
  const [savedKey, setSavedKey] = useState(() =>
    snapshotNamesPolicy(NAMES_DEFAULT_POLICY),
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NamesFilterKey>("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] =
    useState<NameFrameFormValues>(emptyFrameForm());
  const [retryToastId, setRetryToastId] = useState<string | null>(null);
  const { toasts, push, dismiss } = useRedeemToasts();

  const dirty = snapshotNamesPolicy(policy) !== savedKey;
  const stats = useMemo(
    () => computeNamesStats(frames, fonts),
    [frames, fonts],
  );

  useEffect(() => {
    setAllowed(canAccessNames());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bundle = await fetchNamesBundle();
      setPolicy(bundle.policy);
      setFrames(bundle.frames);
      setFonts(bundle.fonts);
      setSavedKey(snapshotNamesPolicy(bundle.policy));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load names.";
      const id = push("error", NAMES_TOAST_TITLES.loadError, message, {
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
  }, [filter, query, tab]);

  const filteredFrames = useMemo(() => {
    const q = query.trim().toLowerCase();
    return frames.filter((row) => {
      if (filter === "live" && !row.enabled) return false;
      if (filter === "disabled" && row.enabled) return false;
      if (filter === "premium" && !row.premium) return false;
      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.label.toLowerCase().includes(q) ||
        row.prefix.includes(q) ||
        row.suffix.includes(q)
      );
    });
  }, [frames, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredFrames.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredFrames.slice(start, start + PAGE_SIZE);
  }, [filteredFrames, page]);

  async function handleSave() {
    if (!fonts.some((f) => f.enabled)) {
      push("error", NAMES_TOAST_TITLES.error, "At least one letter font must stay enabled.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveNamesBundle({ policy });
      setPolicy(saved.policy);
      setFrames(saved.frames);
      setFonts(saved.fonts);
      setSavedKey(snapshotNamesPolicy(saved.policy));
      push(
        "success",
        NAMES_TOAST_TITLES.success,
        "Policy live — Android syncs on next open.",
      );
    } catch (e) {
      push(
        "error",
        NAMES_TOAST_TITLES.error,
        e instanceof Error ? e.message : "Save failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    if (frames.length >= 80) {
      push("error", NAMES_TOAST_TITLES.error, "Frame table is full (max 80).");
      return;
    }
    setTab("frames");
    setFormMode("add");
    setEditingId(null);
    setFormInitial(emptyFrameForm());
    setFormOpen(true);
  }

  function openEdit(id: string) {
    const row = frames.find((r) => r.id === id);
    if (!row) return;
    setFormMode("edit");
    setEditingId(id);
    setFormInitial(frameToForm(row));
    setFormOpen(true);
  }

  async function saveFrame(
    values: NameFrameFormValues,
  ): Promise<string | null> {
    return persistFrame(values, formMode, frames, editingId, setFrames, push);
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
        <h1 className="text-[17px] font-bold text-rose-950">No Names access</h1>
        <p className="mt-2 text-[13px] text-rose-800">
          Your staff role is missing the <code>names</code> module.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <NamesHeader
        dirty={dirty}
        saving={saving}
        onAddFrame={openAdd}
        onSave={() => void handleSave()}
        onReset={() => {
          void load().then(() =>
            push("success", NAMES_TOAST_TITLES.success, "Reverted to last saved policy."),
          );
        }}
      />
      <NamesStats
        frames={stats.frames}
        liveFrames={stats.liveFrames}
        premium={stats.premium}
        fonts={stats.fonts}
        liveFonts={stats.liveFonts}
      />
      <NamesTabs active={tab} onChange={setTab} />
      {loading ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-400">
          Loading live names catalog…
        </p>
      ) : null}
      {!loading && tab === "policy" ? (
        <NamesPolicyCard
          policy={policy}
          onChange={setPolicy}
          onSave={() => void handleSave()}
        />
      ) : null}
      {!loading && tab === "fonts" ? (
        fonts.length === 0 ? (
          <NamesEmptyState
            title="No letter fonts"
            body="Fonts appear here from Nest. Toggle which maps Android can generate."
          />
        ) : (
          <NamesFontsTable
            rows={fonts}
            onToggle={(id) => {
              void toggleFontRow(id, fonts, setFonts, push);
            }}
          />
        )
      ) : null}
      {!loading && tab === "frames" ? (
        <NamesFramesSection
          query={query}
          filter={filter}
          page={page}
          pageSize={PAGE_SIZE}
          frames={frames}
          filtered={filteredFrames}
          paged={paged}
          onQuery={setQuery}
          onFilter={setFilter}
          onPage={setPage}
          onEdit={openEdit}
          onToggle={(id) => {
            void toggleFrameRow(id, frames, setFrames, push);
          }}
          onDelete={(id) => {
            void deleteFrameRow(id, frames, setFrames, push);
          }}
        />
      ) : null}
      {!loading ? <NamesCapabilities /> : null}
      <NamesFrameFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        onClose={() => setFormOpen(false)}
        onSave={saveFrame}
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
