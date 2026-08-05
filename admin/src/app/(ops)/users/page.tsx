"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UsersCapabilities } from "@/components/users-desk/UsersCapabilities";
import { UsersDetailDrawer } from "@/components/users-desk/UsersDetailDrawer";
import { UsersEmptyState } from "@/components/users-desk/UsersEmptyState";
import { UsersHeader } from "@/components/users-desk/UsersHeader";
import { UsersPagination } from "@/components/users-desk/UsersPagination";
import { UsersStats } from "@/components/users-desk/UsersStats";
import { UsersTable } from "@/components/users-desk/UsersTable";
import {
  UsersToolbar,
  type UsersFilterKey,
} from "@/components/users-desk/UsersToolbar";
import {
  fetchUsers,
  setUserStatusApi,
} from "@/components/users-desk/users-api";
import {
  canExportCsv,
  fetchOpsSettings,
} from "@/components/settings-desk/settings-api";
import {
  computeUserStats,
  type UserListRow,
} from "@/components/users-desk/users-data";

const PAGE_SIZE = 12;
const STALE_HOURS = 48;

function canAccessUsers(): boolean {
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
      ? admin.allowedModules.includes("users")
      : false;
  } catch {
    return false;
  }
}

function usersCsv(rows: UserListRow[]): string {
  const header = [
    "id",
    "displayName",
    "email",
    "status",
    "deviceId",
    "coinBalance",
    "claimsCount",
    "lastActiveLabel",
  ];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.displayName,
        r.email,
        r.status,
        r.deviceId,
        r.coinBalance,
        r.claimsCount,
        r.lastActiveLabel,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}

// --- Start: Users admin live wire (Sachin) ---
export default function UsersPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<UserListRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UsersFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessUsers());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await fetchUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
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

  const stats = useMemo(() => computeUserStats(users), [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((row) => {
      if (filter === "active" && row.status !== "ACTIVE") return false;
      if (filter === "restricted" && row.status !== "RESTRICTED") return false;
      if (filter === "suspended" && row.status !== "SUSPENDED") return false;
      if (filter === "stale" && row.lastActiveHoursAgo < STALE_HOURS) {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.displayName,
        row.email,
        row.deviceId,
        row.deviceLabel,
        row.note,
        row.id,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [users, query, filter]);

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
    ? (users.find((u) => u.id === inspectId) ?? null)
    : null;

  async function applyStatus(
    id: string,
    action: "restrict" | "suspend" | "restore",
    message: string,
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const row = await setUserStatusApi(id, action);
      setUsers((rows) => rows.map((r) => (r.id === id ? row : r)));
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setBusy(false);
    }
  }

  function restrictUser(id: string) {
    const row = users.find((u) => u.id === id);
    void applyStatus(
      id,
      "restrict",
      `Restricted ${row?.displayName ?? "user"} — redeem unlocks soft-gated.`,
    );
  }

  function suspendUser(id: string) {
    const row = users.find((u) => u.id === id);
    void applyStatus(
      id,
      "suspend",
      `Suspended ${row?.displayName ?? "user"} — Google seat blocked from app.`,
    );
  }

  function restoreUser(id: string) {
    const row = users.find((u) => u.id === id);
    void applyStatus(
      id,
      "restore",
      `Restored ${row?.displayName ?? "user"} — back to Active.`,
    );
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-sm text-amber-950">
        You do not have access to the Users module.
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <UsersHeader
        onRefresh={() => {
          void load().then(() => {
            setNotice("Users refreshed from Nest.");
            setFilter("all");
            setQuery("");
          });
        }}
        onExport={() => {
          void (async () => {
            try {
              const s = await fetchOpsSettings();
              if (!canExportCsv(s.security.allowViewerCsvExport)) {
                setNotice("Viewer CSV export is disabled in Settings.");
                return;
              }
            } catch {
              if (!canExportCsv(false)) {
                setNotice("Viewer CSV export is disabled in Settings.");
                return;
              }
            }
            const blob = new Blob([usersCsv(filtered)], {
              type: "text/csv;charset=utf-8",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `users-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            setNotice(`Exported ${filtered.length} user row(s) (email masked).`);
          })();
        }}
      />
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-500">Loading users…</p>
      ) : (
        <>
          <UsersStats
            total={stats.total}
            active={stats.active}
            restricted={stats.restricted}
            suspended={stats.suspended}
            coinsHeld={stats.coinsHeld}
          />

          <UsersToolbar
            query={query}
            filter={filter}
            onQuery={setQuery}
            onFilter={setFilter}
          />

          {paged.length === 0 ? (
            <UsersEmptyState query={query} />
          ) : (
            <UsersTable
              rows={paged}
              notice={notice}
              onInspect={setInspectId}
              onRestrict={restrictUser}
              onSuspend={suspendUser}
              onRestore={restoreUser}
              footer={
                <UsersPagination
                  page={safePage}
                  totalPages={totalPages}
                  total={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPage={setPage}
                />
              }
            />
          )}
        </>
      )}

      <UsersCapabilities />

      <UsersDetailDrawer
        open={Boolean(inspectRow)}
        row={inspectRow}
        onClose={() => setInspectId(null)}
        onRestrict={restrictUser}
        onSuspend={suspendUser}
        onRestore={restoreUser}
      />
    </section>
  );
}
// --- End: Users admin live wire (Sachin) ---
