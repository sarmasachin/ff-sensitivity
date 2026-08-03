"use client";

import { useEffect, useMemo, useState } from "react";
import { StaffCapabilities } from "@/components/staff/StaffCapabilities";
import { StaffDetailDrawer } from "@/components/staff/StaffDetailDrawer";
import { StaffEmptyState } from "@/components/staff/StaffEmptyState";
import { StaffHeader } from "@/components/staff/StaffHeader";
import {
  StaffInviteModal,
  type StaffInvitePayload,
} from "@/components/staff/StaffInviteModal";
import { StaffPagination } from "@/components/staff/StaffPagination";
import { StaffStats } from "@/components/staff/StaffStats";
import { StaffTable } from "@/components/staff/StaffTable";
import {
  StaffToolbar,
  type StaffFilterKey,
} from "@/components/staff/StaffToolbar";
import {
  STAFF_DEMO_ROWS,
  computeStaffStats,
  type StaffListRow,
  type StaffModuleId,
} from "@/components/staff/staff-data";

const PAGE_SIZE = 5;

function todayLabel(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function StaffPage() {
  const [rows, setRows] = useState<StaffListRow[]>(() => [...STAFF_DEMO_ROWS]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StaffFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const stats = useMemo(() => computeStaffStats(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "active" && row.status !== "ACTIVE") return false;
      if (filter === "invited" && row.status !== "INVITED") return false;
      if (filter === "disabled" && row.status !== "DISABLED") return false;
      if (
        filter === "admin" &&
        row.role !== "SUPER_ADMIN" &&
        row.role !== "ADMIN"
      ) {
        return false;
      }
      if (filter === "sub" && row.role !== "SUB_ADMIN") return false;
      if (filter === "viewer" && row.role !== "VIEWER") return false;
      if (!q) return true;
      const hay = [row.name, row.email, row.note, row.role]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const inspectRow = inspectId
    ? (rows.find((r) => r.id === inspectId) ?? null)
    : null;

  function disableAccount(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.role === "SUPER_ADMIN") return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "DISABLED",
              note: `${r.note} · Disabled by staff.`,
            }
          : r,
      ),
    );
    setNotice(`Disabled ${row.email}.`);
  }

  function enableAccount(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "ACTIVE",
              note: "Re-enabled by staff. Sessions allowed again.",
            }
          : r,
      ),
    );
    setNotice(`Enabled ${row.email}.`);
  }

  function resendInvite(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.status !== "INVITED") return;
    setNotice(`Invite resent to ${row.email} (local demo).`);
  }

  function toggleModule(id: string, moduleId: StaffModuleId) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.role === "SUPER_ADMIN") return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const has = r.modules.includes(moduleId);
        const modules = has
          ? r.modules.filter((m) => m !== moduleId)
          : [...r.modules, moduleId];
        return { ...r, modules };
      }),
    );
  }

  function inviteStaff(payload: StaffInvitePayload) {
    const exists = rows.some(
      (r) => r.email.toLowerCase() === payload.email.toLowerCase(),
    );
    if (exists) {
      setNotice(`Invite blocked — ${payload.email} already exists.`);
      setInviteOpen(false);
      return;
    }
    const id = `s_${Date.now()}`;
    setRows((prev) => [
      {
        id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        status: "INVITED",
        modules: payload.modules,
        lastLoginLabel: "Never",
        invitedAtLabel: todayLabel(),
        note: "Invite sent (local demo).",
      },
      ...prev,
    ]);
    setInviteOpen(false);
    setNotice(`Invite sent to ${payload.email} as ${payload.role}.`);
    setFilter("invited");
  }

  const queueEmpty = rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <StaffHeader
        onInvite={() => setInviteOpen(true)}
        onRefresh={() =>
          setNotice("Refresh will sync from Nest staff auth next.")
        }
      />
      <StaffStats
        total={stats.total}
        active={stats.active}
        invited={stats.invited}
        disabled={stats.disabled}
        admins={stats.admins}
      />
      <StaffToolbar
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />

      {queueEmpty ? (
        <StaffEmptyState kind="queue" />
      ) : filterEmpty ? (
        <StaffEmptyState
          kind="filter"
          onClearFilter={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      ) : (
        <StaffTable
          rows={paged}
          notice={notice}
          onInspect={setInspectId}
          onDisable={disableAccount}
          onEnable={enableAccount}
          onResend={resendInvite}
          footer={
            <StaffPagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPage={setPage}
            />
          }
        />
      )}

      <StaffCapabilities />

      <StaffDetailDrawer
        open={!!inspectRow}
        row={inspectRow}
        onClose={() => setInspectId(null)}
        onDisable={disableAccount}
        onEnable={enableAccount}
        onResend={resendInvite}
        onToggleModule={toggleModule}
      />

      <StaffInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={inviteStaff}
      />
    </section>
  );
}
