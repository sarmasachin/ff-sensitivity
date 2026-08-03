"use client";

import { useEffect, useMemo, useState } from "react";
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
  DEVICES_DEMO_ROWS,
  computeDeviceStats,
  type DeviceListRow,
} from "@/components/devices/devices-data";

const PAGE_SIZE = 5;

export default function DevicesPage() {
  const [rows, setRows] = useState<DeviceListRow[]>(() => [
    ...DEVICES_DEMO_ROWS,
  ]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DevicesFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

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

  function blockDevice(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "BLOCKED",
              pushEnabled: false,
              note: `${r.note} · Blocked by staff.`,
            }
          : r,
      ),
    );
    setNotice(`Blocked ${row.deviceId} (${row.label}).`);
  }

  function unblockDevice(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: r.lastSeenHoursAgo > 72 ? "STALE" : "ACTIVE",
              pushEnabled: r.hasFcmToken,
              note: "Unblocked by staff. Push restored if token present.",
            }
          : r,
      ),
    );
    setNotice(`Unblocked ${row.deviceId}.`);
  }

  function invalidateToken(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || !row.hasFcmToken) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              hasFcmToken: false,
              fcmTokenMasked: "—",
              pushEnabled: false,
              note: `${r.note} · FCM token invalidated by staff.`,
            }
          : r,
      ),
    );
    setNotice(`Dropped FCM token for ${row.deviceId}.`);
  }

  const queueEmpty = rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <DevicesHeader
        onRefresh={() =>
          setNotice("Refresh will sync from Nest device registry next.")
        }
        onExport={() =>
          setNotice("CSV export will work after Devices API is connected.")
        }
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
          onBlock={blockDevice}
          onUnblock={unblockDevice}
          onInvalidateToken={invalidateToken}
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
        onBlock={blockDevice}
        onUnblock={unblockDevice}
        onInvalidateToken={invalidateToken}
      />
    </section>
  );
}
