"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  cancelPushCampaign,
  deletePushCampaign,
  fetchPushCampaigns,
  sendPushCampaign,
  upsertPushCampaign,
} from "@/components/push/push-api";
import {
  campaignToForm,
  computePushStats,
  emptyPushForm,
  type PushCampaignRow,
  type PushFormValues,
} from "@/components/push/push-data";

const PAGE_SIZE = 12;

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

function canAccessPush(): boolean {
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
      ? admin.allowedModules.includes("push")
      : false;
  } catch {
    return false;
  }
}

function canSendLive(): boolean {
  if (typeof window === "undefined") return false;
  const raw =
    sessionStorage.getItem("ffops_admin") ?? localStorage.getItem("ffops_admin");
  if (!raw) return false;
  try {
    const admin = JSON.parse(raw) as { role?: string };
    return admin.role === "SUPER_ADMIN" || admin.role === "ADMIN";
  } catch {
    return false;
  }
}

// --- Start: Push live wire (Sachin) ---
export default function PushPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<PushCampaignRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PushFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<PushFormValues>(emptyPushForm);

  useEffect(() => {
    setAllowed(canAccessPush());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const campaigns = await fetchPushCampaigns();
      setRows(campaigns);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load push campaigns.");
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
    if (!row || row.status === "SENT" || row.status === "FAILED") return;
    setFormMode("edit");
    setEditingId(id);
    setFormInitial(campaignToForm(row));
    setFormOpen(true);
  }

  async function onModalSave(row: PushCampaignRow) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const mode =
        row.status === "SCHEDULED"
          ? ("later" as const)
          : ("draft" as const);
      const saved = await upsertPushCampaign({
        id: row.id,
        title: row.title,
        body: row.body,
        deepLink: row.deepLink,
        audience: row.audience,
        topic: row.topic,
        scheduleMode: mode,
        scheduledAt: row.scheduledAt ?? undefined,
      });
      setRows((prev) => {
        const without = prev.filter((r) => r.id !== saved.id);
        return [saved, ...without];
      });
      setNotice(`Saved campaign “${saved.title}”.`);
      setFormOpen(false);
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendCampaign(id: string) {
    if (!canSendLive()) {
      setError("Only Super Admin / Admin can send push campaigns.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await sendPushCampaign(id);
      setRows((prev) => prev.map((r) => (r.id === id ? saved : r)));
      setNotice(
        `Sent “${saved.title}” — delivered ${saved.delivered} registered token(s).`,
      );
    } catch (e) {
      setNotice(null);
      setError(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelCampaign(id: string) {
    setBusy(true);
    setError(null);
    try {
      const saved = await cancelPushCampaign(id);
      setRows((prev) => prev.map((r) => (r.id === id ? saved : r)));
      setNotice(`Cancelled “${saved.title}”.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCampaign(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deletePushCampaign(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setNotice("Campaign deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center text-[13px] font-medium text-rose-900">
          You do not have access to Push. Ask a Super Admin for the push module.
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-2xl border border-[#e8eaee] bg-white px-5 py-10 text-center text-[13px] text-slate-500">
          Loading push campaigns…
        </div>
      </section>
    );
  }

  const queueEmpty = rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <PushHeader onCompose={busy ? undefined : openCompose} />
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
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-900"
        >
          {error}
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
          body="Compose a campaign with title, body, audience, and schedule."
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
            onSend={(id) => {
              if (!busy) void sendCampaign(id);
            }}
            onCancel={(id) => {
              if (!busy) void cancelCampaign(id);
            }}
            onDelete={(id) => {
              if (!busy) void removeCampaign(id);
            }}
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
        onSave={(row) => void onModalSave(row)}
      />
    </section>
  );
}
// --- End: Push live wire (Sachin) ---
