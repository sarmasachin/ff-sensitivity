"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  disableStaffApi,
  enableStaffApi,
  fetchStaff,
  inviteStaffApi,
  resendInviteApi,
  setStaffModulesApi,
} from "@/components/staff/staff-api";
import {
  computeStaffStats,
  type StaffListRow,
  type StaffModuleId,
} from "@/components/staff/staff-data";

const PAGE_SIZE = 12;

function canAccessStaff(): boolean {
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
      ? admin.allowedModules.includes("staff")
      : false;
  } catch {
    return false;
  }
}

// --- Start: Staff admin live wire (Sachin) ---
export default function StaffPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<StaffListRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StaffFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    setAllowed(canAccessStaff());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchStaff());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load staff.");
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

  function upsertRow(next: StaffListRow) {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === next.id);
      if (i < 0) return [next, ...prev];
      const copy = [...prev];
      copy[i] = next;
      return copy;
    });
  }

  async function disableAccount(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const row = await disableStaffApi(id);
      upsertRow(row);
      setNotice(`Disabled ${row.email}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disable failed.");
    } finally {
      setBusy(false);
    }
  }

  async function enableAccount(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const row = await enableStaffApi(id);
      upsertRow(row);
      setNotice(`Enabled ${row.email}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enable failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resendInvite(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { staff, temporaryPassword } = await resendInviteApi(id);
      upsertRow(staff);
      setNotice(
        `Invite resent to ${staff.email}. Temp password: ${temporaryPassword}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resend failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleModule(id: string, moduleId: StaffModuleId) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.role === "SUPER_ADMIN" || busy) return;
    const has = row.modules.includes(moduleId);
    const modules = has
      ? row.modules.filter((m) => m !== moduleId)
      : [...row.modules, moduleId];
    if (modules.length === 0) {
      setError("Assign at least one module.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await setStaffModulesApi(id, modules);
      upsertRow(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Module update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function inviteStaff(payload: StaffInvitePayload) {
    if (busy) return;
    if (payload.role === "SUPER_ADMIN") {
      setError("Cannot invite Super Admin from this desk.");
      setInviteOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { staff, temporaryPassword } = await inviteStaffApi({
        name: payload.name,
        email: payload.email,
        role: payload.role,
        modules: payload.modules,
        currentPassword: payload.currentPassword,
      });
      upsertRow(staff);
      setInviteOpen(false);
      setNotice(
        `Invite created for ${staff.email} as ${staff.role}. Temp password: ${temporaryPassword}`,
      );
      setFilter("invited");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite failed.");
      setInviteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-sm text-amber-950">
        You do not have access to the Staff module.
      </section>
    );
  }

  const queueEmpty = !loading && rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <StaffHeader
        onInvite={() => setInviteOpen(true)}
        onRefresh={() => {
          void load().then(() => setNotice("Staff refreshed from Nest."));
        }}
      />
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-500">Loading staff…</p>
      ) : (
        <>
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
              onDisable={(id) => void disableAccount(id)}
              onEnable={(id) => void enableAccount(id)}
              onResend={(id) => void resendInvite(id)}
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
        </>
      )}

      <StaffCapabilities />

      <StaffDetailDrawer
        open={!!inspectRow}
        row={inspectRow}
        onClose={() => setInspectId(null)}
        onDisable={(id) => void disableAccount(id)}
        onEnable={(id) => void enableAccount(id)}
        onResend={(id) => void resendInvite(id)}
        onToggleModule={(id, m) => void toggleModule(id, m)}
      />

      <StaffInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={(p) => void inviteStaff(p)}
      />
    </section>
  );
}
// --- End: Staff admin live wire (Sachin) ---
