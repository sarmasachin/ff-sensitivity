"use client";

import { useEffect, useMemo, useState } from "react";
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
  NAMES_DEFAULT_POLICY,
  NAMES_DEMO_FONTS,
  NAMES_DEMO_FRAMES,
  computeNamesStats,
  emptyFrameForm,
  frameToForm,
  type NameFontRow,
  type NameFrameFormValues,
  type NameFrameRow,
  type NamesPolicy,
  type NamesTabId,
} from "@/components/names/names-data";

const PAGE_SIZE = 6;

export default function NamesPage() {
  const [tab, setTab] = useState<NamesTabId>("frames");
  const [frames, setFrames] = useState<NameFrameRow[]>(() => [
    ...NAMES_DEMO_FRAMES,
  ]);
  const [fonts, setFonts] = useState<NameFontRow[]>(() => [...NAMES_DEMO_FONTS]);
  const [policy, setPolicy] = useState<NamesPolicy>(NAMES_DEFAULT_POLICY);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NamesFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] =
    useState<NameFrameFormValues>(emptyFrameForm());

  useEffect(() => {
    setPage(1);
  }, [filter, query, tab]);

  const stats = useMemo(
    () => computeNamesStats(frames, fonts),
    [frames, fonts],
  );

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
      setNotice(`Added frame “${row.label}”.`);
      return;
    }
    if (!editingId) return;
    setFrames((prev) =>
      prev.map((f) => (f.id === editingId ? { ...row, id: editingId } : f)),
    );
    setNotice(`Updated frame “${row.label}”.`);
  }

  function toggleFrame(id: string) {
    const row = frames.find((f) => f.id === id);
    if (!row) return;
    setFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
    setNotice(
      `${row.enabled ? "Disabled" : "Enabled"} frame “${row.label}”.`,
    );
  }

  function deleteFrame(id: string) {
    const row = frames.find((f) => f.id === id);
    if (!row) return;
    setFrames((prev) => prev.filter((f) => f.id !== id));
    setNotice(`Deleted frame “${row.label}”.`);
  }

  function toggleFont(id: string) {
    const row = fonts.find((f) => f.id === id);
    if (!row) return;
    setFonts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
    setNotice(`${row.enabled ? "Disabled" : "Enabled"} font “${row.label}”.`);
  }

  const framesEmpty = frames.length === 0;
  const filterEmpty = !framesEmpty && filteredFrames.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <NamesHeader onAddFrame={openAdd} />
      <NamesStats
        frames={stats.frames}
        liveFrames={stats.liveFrames}
        premium={stats.premium}
        fonts={stats.fonts}
        liveFonts={stats.liveFonts}
      />
      <NamesTabs active={tab} onChange={setTab} />

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-[13px] font-medium text-teal-950"
        >
          {notice}
        </div>
      ) : null}

      {tab === "policy" ? (
        <NamesPolicyCard
          policy={policy}
          onChange={setPolicy}
          onSave={() =>
            setNotice(
              `Policy saved — max ${policy.maxNameChars} chars · batch ${policy.maxBatchSize}.`,
            )
          }
        />
      ) : null}

      {tab === "fonts" ? (
        fonts.length === 0 ? (
          <NamesEmptyState
            title="No letter fonts"
            body="Font maps will appear here once the catalog is seeded."
          />
        ) : (
          <NamesFontsTable rows={fonts} onToggle={toggleFont} />
        )
      ) : null}

      {tab === "frames" ? (
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

      <NamesCapabilities />

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
