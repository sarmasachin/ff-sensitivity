"use client";

import { useEffect, useMemo, useState } from "react";
import { AuditCapabilities } from "@/components/audit/AuditCapabilities";
import { AuditDetailDrawer } from "@/components/audit/AuditDetailDrawer";
import { AuditEmptyState } from "@/components/audit/AuditEmptyState";
import { AuditHeader } from "@/components/audit/AuditHeader";
import { AuditPagination } from "@/components/audit/AuditPagination";
import { AuditStats } from "@/components/audit/AuditStats";
import { AuditTable } from "@/components/audit/AuditTable";
import {
  AuditToolbar,
  type AuditFilterKey,
} from "@/components/audit/AuditToolbar";
import {
  AUDIT_DEMO_ROWS,
  computeAuditStats,
  type AuditListRow,
} from "@/components/audit/audit-data";

const PAGE_SIZE = 5;

export default function AuditPage() {
  const [rows] = useState<AuditListRow[]>(() => [...AUDIT_DEMO_ROWS]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AuditFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const stats = useMemo(() => computeAuditStats(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (filter === "today" && row.hoursAgo >= 24) return false;
        if (filter === "login" && row.category !== "LOGIN") return false;
        if (filter === "redeem" && row.category !== "REDEEM") return false;
        if (filter === "inventory" && row.category !== "INVENTORY") return false;
        if (filter === "staff" && row.category !== "STAFF") return false;
        if (filter === "wallet" && row.category !== "WALLET") return false;
        if (filter === "config" && row.category !== "CONFIG") return false;
        if (
          filter === "denied" &&
          row.result !== "DENIED" &&
          row.result !== "FAILED"
        ) {
          return false;
        }
        if (!q) return true;
        const hay = [
          row.actorName,
          row.actorEmail,
          row.action,
          row.target,
          row.detail,
          row.category,
          row.result,
          row.ipLabel,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.hoursAgo - b.hoursAgo);
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

  const queueEmpty = rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <AuditHeader
        onRefresh={() =>
          setNotice("Refresh will sync from Nest audit log next.")
        }
        onExport={() =>
          setNotice("CSV export will work after Audit API is connected.")
        }
      />
      <AuditStats
        total={stats.total}
        today={stats.today}
        logins={stats.logins}
        denied={stats.denied}
        reveals={stats.reveals}
      />
      <AuditToolbar
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />

      {queueEmpty ? (
        <AuditEmptyState kind="queue" />
      ) : filterEmpty ? (
        <AuditEmptyState
          kind="filter"
          onClearFilter={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      ) : (
        <AuditTable
          rows={paged}
          notice={notice}
          onInspect={setInspectId}
          footer={
            <AuditPagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPage={setPage}
            />
          }
        />
      )}

      <AuditCapabilities />

      <AuditDetailDrawer
        open={!!inspectRow}
        row={inspectRow}
        onClose={() => setInspectId(null)}
      />
    </section>
  );
}
