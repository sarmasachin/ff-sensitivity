"use client";

import { useEffect, useMemo, useState } from "react";
import { PushCapabilities } from "@/components/push/PushCapabilities";
import { PushComposeModal } from "@/components/push/PushComposeModal";
import { PushEmptyState } from "@/components/push/PushEmptyState";
import { PushHeader } from "@/components/push/PushHeader";
import { PushPagination } from "@/components/push/PushPagination";
import { PushStats } from "@/components/push/PushStats";
import { PushTable } from "@/components/push/PushTable";
import {
  PushToolbar,
  type PushFilterKey,
} from "@/components/push/PushToolbar";
import {
  PUSH_DEMO_ROWS,
  campaignToForm,
  computePushStats,
  emptyPushForm,
  type PushCampaignRow,
  type PushFormValues,
} from "@/components/push/push-data";

const PAGE_SIZE = 5;

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sortCampaigns(rows: PushCampaignRow[]): PushCampaignRow[] {
  const rank: Record<PushCampaignRow["status"], number> = {
    SCHEDULED: 0,
    DRAFT: 1,
    FAILED: 2,
    SENT: 3,
    CANCELLED: 4,
  };
  return [...rows].sort((a, b) => {
    const r = rank[a.status] - rank[b.status];
    if (r !== 0) return r;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export default function PushPage() {
  const [rows, setRows] = useState<PushCampaignRow[]>(() => [
    ...PUSH_DEMO_ROWS,
  ]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PushFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<PushFormValues>(emptyPushForm);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const stats = useMemo(() => computePushStats(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortCampaigns(rows).filter((row) => {
      if (filter === "draft" && row.status !== "DRAFT") return false;
      if (filter === "scheduled" && row.status !== "SCHEDULED") return false;
      if (filter === "sent" && row.status !== "SENT") return false;
      if (filter === "failed" && row.status !== "FAILED") return false;
      if (filter === "cancelled" && row.status !== "CANCELLED") return false;
      if (!q) return true;
      const hay = [
        row.id,
        row.title,
        row.body,
        row.deepLink,
        row.topic,
        row.audience,
        row.createdBy,
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

  const editingRow = editingId
    ? (rows.find((r) => r.id === editingId) ?? null)
    : null;

  function openCompose() {
    setFormMode("add");
    setEditingId(null);
    setFormInitial(emptyPushForm());
    setFormOpen(true);
  }

  function openEdit(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.status === "SENT") return;
    setFormMode("edit");
    setEditingId(id);
    setFormInitial(campaignToForm(row));
    setFormOpen(true);
  }

  function saveCampaign(row: PushCampaignRow) {
    if (formMode === "add") {
      if (rows.some((r) => r.id === row.id)) {
        setNotice(`Campaign id “${row.id}” already exists.`);
        return;
      }
      setRows((prev) => [row, ...prev]);
      setNotice(`Saved campaign “${row.title}”.`);
      return;
    }
    if (!editingId) return;
    setRows((prev) =>
      prev.map((r) => (r.id === editingId ? { ...row, id: editingId } : r)),
    );
    setNotice(`Updated campaign “${row.title}”.`);
  }

  function sendCampaign(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const stamp = nowStamp();
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "SENT",
              sentAt: stamp,
              updatedAt: stamp,
              delivered: r.delivered > 0 ? r.delivered : 12500,
              failed: r.failed > 0 ? r.failed : 48,
            }
          : r,
      ),
    );
    setNotice(`Sent “${row.title}” (Admin demo — FCM API next).`);
  }

  function cancelCampaign(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "CANCELLED", updatedAt: nowStamp() }
          : r,
      ),
    );
    setNotice(`Cancelled “${row.title}”.`);
  }

  function deleteCampaign(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setNotice(`Deleted “${row.title}”.`);
  }

  const queueEmpty = rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <PushHeader onCompose={openCompose} />
      <PushStats
        total={stats.total}
        scheduled={stats.scheduled}
        drafts={stats.drafts}
        sent={stats.sent}
        failed={stats.failed}
      />

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-[13px] font-medium text-cyan-950"
        >
          {notice}
        </div>
      ) : null}

      <PushToolbar
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />

      {queueEmpty ? (
        <PushEmptyState
          title="No campaigns yet"
          body="Compose an FCM campaign with title, body, audience, and schedule."
        />
      ) : filterEmpty ? (
        <PushEmptyState
          title="No matches"
          body="Try another search or filter."
        />
      ) : (
        <>
          <PushTable
            rows={paged}
            onEdit={openEdit}
            onSend={sendCampaign}
            onCancel={cancelCampaign}
            onDelete={deleteCampaign}
          />
          <PushPagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </>
      )}

      <PushCapabilities />

      <PushComposeModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        existing={editingRow}
        onClose={() => setFormOpen(false)}
        onSave={saveCampaign}
      />
    </section>
  );
}
