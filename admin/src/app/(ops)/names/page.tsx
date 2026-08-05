"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NamesCapabilities } from "@/components/names/NamesCapabilities";
import { NamesEmptyState } from "@/components/names/NamesEmptyState";
import { NamesFontsTable } from "@/components/names/NamesFontsTable";
import { NamesFrameFormModal } from "@/components/names/NamesFrameFormModal";
import { NamesFramesTable } from "@/components/names/NamesFramesTable";
import { NamesHeader } from "@/components/names/NamesHeader";
import { NamesPagination } from "@/components/names/NamesPagination";
import { NamesPolicyCard } from "@/components/names/NamesPolicyCard";
import { NamesStats } from "@/components/names/NamesStats";
import { NamesTabs } from "@/components/names/NamesTabs";
import {
  NamesToolbar,
  type NamesFilterKey,
} from "@/components/names/NamesToolbar";
import {
  fetchNamesBundle,
  saveNamesBundle,
} from "@/components/names/names-api";
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

const PAGE_SIZE = 12;

function snapKey(
  policy: NamesPolicy,
  frames: NameFrameRow[],
  fonts: NameFontRow[],
) {
  return JSON.stringify({ policy, frames, fonts });
}

function canAccessNames(): boolean {
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
      ? admin.allowedModules.includes("names")
      : false;
  } catch {
    return false;
  }
}

export default function NamesPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<NamesTabId>("frames");
  const [frames, setFrames] = useState<NameFrameRow[]>([]);
  const [fonts, setFonts] = useState<NameFontRow[]>([]);
  const [policy, setPolicy] = useState<NamesPolicy>(NAMES_DEFAULT_POLICY);
  const [savedKey, setSavedKey] = useState(() =>
    snapKey(NAMES_DEFAULT_POLICY, [], []),
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NamesFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] =
    useState<NameFrameFormValues>(emptyFrameForm());

  const dirty = snapKey(policy, frames, fonts) !== savedKey;
  const stats = useMemo(
    () => computeNamesStats(frames, fonts),
    [frames, fonts],
  );

  useEffect(() => {
    setAllowed(canAccessNames());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bundle = await fetchNamesBundle();
      setPolicy(bundle.policy);
      setFrames(bundle.frames);
      setFonts(bundle.fonts);
      setSavedKey(snapKey(bundle.policy, bundle.frames, bundle.fonts));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load names.");
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
      setError("At least one letter font must stay enabled.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveNamesBundle({ policy, frames, fonts });
      setPolicy(saved.policy);
      setFrames(saved.frames);
      setFonts(saved.fonts);
      setSavedKey(snapKey(saved.policy, saved.frames, saved.fonts));
      setNotice("Names catalog saved live — Android syncs on next open.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
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

  function saveFrame(row: NameFrameRow) {
    if (formMode === "add") {
      if (frames.some((f) => f.id === row.id)) {
        setNotice(`Frame id “${row.id}” already exists.`);
        return;
      }
      setFrames((prev) => [row, ...prev]);
      setNotice(`Added frame “${row.label}”. Save to push live.`);
      return;
    }
    if (!editingId) return;
    setFrames((prev) =>
      prev.map((f) => (f.id === editingId ? { ...row, id: editingId } : f)),
    );
    setNotice(`Updated frame “${row.label}”. Save to push live.`);
  }

  function toggleFrame(id: string) {
    const row = frames.find((f) => f.id === id);
    if (!row) return;
    setFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
    setNotice(
      `${row.enabled ? "Disabled" : "Enabled"} frame “${row.label}”. Save to push.`,
    );
  }

  function deleteFrame(id: string) {
    const row = frames.find((f) => f.id === id);
    if (!row) return;
    if (!window.confirm(`Delete frame “${row.label}”?`)) return;
    setFrames((prev) => prev.filter((f) => f.id !== id));
    setNotice(`Deleted frame “${row.label}”. Save to push live.`);
  }

  function toggleFont(id: string) {
    const row = fonts.find((f) => f.id === id);
    if (!row) return;
    setFonts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
    setNotice(
      `${row.enabled ? "Disabled" : "Enabled"} font “${row.label}”. Save to push.`,
    );
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

  const framesEmpty = frames.length === 0;
  const filterEmpty = !framesEmpty && filteredFrames.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <NamesHeader
        dirty={dirty}
        saving={saving}
        onAddFrame={openAdd}
        onSave={() => void handleSave()}
        onReset={() => void load().then(() => setNotice("Reverted to server."))}
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
          Loading names catalog…
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
          className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-[13px] font-medium text-teal-950"
        >
          {notice}
        </div>
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
            body="Font maps will appear here once the catalog is seeded."
          />
        ) : (
          <NamesFontsTable rows={fonts} onToggle={toggleFont} />
        )
      ) : null}

      {!loading && tab === "frames" ? (
        <>
          <NamesToolbar
            query={query}
            filter={filter}
            onQuery={setQuery}
            onFilter={setFilter}
          />
          {framesEmpty ? (
            <NamesEmptyState
              title="No frames yet"
              body="Add a prefix/suffix frame pack for Stylish Names."
            />
          ) : filterEmpty ? (
            <NamesEmptyState
              title="No matches"
              body="Try another search or filter."
            />
          ) : (
            <>
              <NamesFramesTable
                rows={paged}
                onEdit={openEdit}
                onToggle={toggleFrame}
                onDelete={deleteFrame}
              />
              <NamesPagination
                page={page}
                totalPages={totalPages}
                totalItems={filteredFrames.length}
                pageSize={PAGE_SIZE}
                onPage={setPage}
              />
            </>
          )}
        </>
      ) : null}

      {!loading ? <NamesCapabilities /> : null}

      <NamesFrameFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        onClose={() => setFormOpen(false)}
        onSave={saveFrame}
      />
    </section>
  );
}
