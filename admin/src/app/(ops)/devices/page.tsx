"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DevicesCapabilities } from "@/components/devices/DevicesCapabilities";
import { DevicesDetailDrawer } from "@/components/devices/DevicesDetailDrawer";
import { DevicesEmptyState } from "@/components/devices/DevicesEmptyState";
import { DevicesHeader } from "@/components/devices/DevicesHeader";
import { DevicesPagination } from "@/components/devices/DevicesPagination";
import { DevicesStats } from "@/components/devices/DevicesStats";
import { DevicesTable } from "@/components/devices/DevicesTable";
import {
  DevicesToolbar,
  type DevicesFilterKey,
} from "@/components/devices/DevicesToolbar";
import {
  blockDeviceApi,
  fetchDevices,
  invalidateDeviceTokenApi,
  unblockDeviceApi,
} from "@/components/devices/devices-api";
import {
  computeDeviceStats,
  type DeviceListRow,
} from "@/components/devices/devices-data";

const PAGE_SIZE = 12;

function canAccessDevices(): boolean {
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
      ? admin.allowedModules.includes("devices")
      : false;
  } catch {
    return false;
  }
}

function devicesToCsv(rows: DeviceListRow[]): string {
  const header = [
    "deviceId",
    "brand",
    "model",
    "androidVersion",
    "appVersion",
    "status",
    "lastSeenLabel",
    "hasFcmToken",
    "coinBalance",
  ];
  const escape = (v: string | number | boolean) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.deviceId,
        r.brand,
        r.model,
        r.androidVersion,
        r.appVersion,
        r.status,
        r.lastSeenLabel,
        r.hasFcmToken,
        r.coinBalance,
      ]
        .map(escape)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

// --- Start: Devices live wire (Sachin) ---
export default function DevicesPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rows, setRows] = useState<DeviceListRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DevicesFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessDevices());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchDevices();
      setRows(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load devices.");
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

  const stats = useMemo(() => computeDeviceStats(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "active" && row.status !== "ACTIVE") return false;
      if (filter === "stale" && row.status !== "STALE") return false;
      if (filter === "blocked" && row.status !== "BLOCKED") return false;
      if (filter === "token" && !row.hasFcmToken) return false;
      if (filter === "no-token" && row.hasFcmToken) return false;
      if (!q) return true;
      const hay = [
        row.deviceId,
        row.label,
        row.brand,
        row.model,
        row.appVersion,
        row.androidVersion,
        row.fcmTokenMasked,
        row.note,
      ]
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

  function replaceRow(next: DeviceListRow) {
    setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)));
  }

  async function blockDevice(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const next = await blockDeviceApi(id);
      replaceRow(next);
      setNotice(`Blocked ${next.deviceId} (${next.label}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Block failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function unblockDevice(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const next = await unblockDeviceApi(id);
      replaceRow(next);
      setNotice(`Unblocked ${next.deviceId}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unblock failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function invalidateToken(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const next = await invalidateDeviceTokenApi(id);
      replaceRow(next);
      setNotice(`Dropped FCM token for ${next.deviceId}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalidate failed.");
    } finally {
      setBusyId(null);
    }
  }

  function onExport() {
    if (filtered.length === 0) {
      setNotice("Nothing to export.");
      return;
    }
    // Never export full FCM — only masked fields from Nest rows.
    const csv = devicesToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devices_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${filtered.length} device row(s) (no raw FCM).`);
  }

  if (!allowed) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center text-[13px] font-medium text-rose-900">
          You do not have access to Devices. Ask a Super Admin for the devices
          module.
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-2xl border border-[#e8eaee] bg-white px-5 py-10 text-center text-[13px] text-slate-500">
          Loading device registry…
        </div>
      </section>
    );
  }

  const queueEmpty = rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <DevicesHeader
        onRefresh={() => {
          void load().then(() => setNotice("Synced from Nest device registry."));
        }}
        onExport={onExport}
      />
      <DevicesStats
        total={stats.total}
        active={stats.active}
        stale={stats.stale}
        blocked={stats.blocked}
        withToken={stats.withToken}
      />
      <DevicesToolbar
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-900"
        >
          {error}
        </div>
      ) : null}
      {busyId ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-600">
          Updating device…
        </div>
      ) : null}

      {queueEmpty ? (
        <DevicesEmptyState kind="queue" />
      ) : filterEmpty ? (
        <DevicesEmptyState
          kind="filter"
          onClearFilter={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      ) : (
        <DevicesTable
          rows={paged}
          notice={notice}
          onInspect={setInspectId}
          onBlock={(id) => void blockDevice(id)}
          onUnblock={(id) => void unblockDevice(id)}
          onInvalidateToken={(id) => void invalidateToken(id)}
          footer={
            <DevicesPagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPage={setPage}
            />
          }
        />
      )}

      <DevicesCapabilities />

      <DevicesDetailDrawer
        open={!!inspectRow}
        row={inspectRow}
        onClose={() => setInspectId(null)}
        onBlock={(id) => void blockDevice(id)}
        onUnblock={(id) => void unblockDevice(id)}
        onInvalidateToken={(id) => void invalidateToken(id)}
      />
    </section>
  );
}
// --- End: Devices live wire (Sachin) ---
