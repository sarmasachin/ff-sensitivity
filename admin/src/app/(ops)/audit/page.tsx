"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { fetchAuditEvents } from "@/components/audit/audit-api";
import {
  computeAuditStats,
  type AuditListRow,
} from "@/components/audit/audit-data";
import {
  canExportCsv,
  fetchOpsSettings,
} from "@/components/settings-desk/settings-api";

const PAGE_SIZE = 12;

function canAccessAudit(): boolean {
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
      ? admin.allowedModules.includes("audit")
      : false;
  } catch {
    return false;
  }
}

function auditCsv(rows: AuditListRow[]): string {
  const header = [
    "id",
    "when",
    "actor",
    "email",
    "category",
    "action",
    "target",
    "result",
    "ip",
    "detail",
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
        r.atLabel,
        r.actorName,
        r.actorEmail,
        r.category,
        r.action,
        r.target,
        r.result,
        r.ipLabel,
        r.detail,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Start: Audit admin live wire (Sachin) ---
export default function AuditPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditListRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AuditFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessAudit());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAuditEvents(200));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit.");
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

  const queueEmpty = !loading && rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  if (!allowed) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <AuditHeader onRefresh={() => undefined} onExport={() => undefined} />
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          You do not have access to Audit. Ask a Super Admin to grant the audit
          module.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <AuditHeader
        onRefresh={() => {
          void load().then(() => setNotice("Audit log refreshed."));
        }}
        onExport={() => {
          void (async () => {
            if (filtered.length === 0) {
              setNotice("Nothing to export for this filter.");
              return;
            }
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
            downloadCsv(
              `audit-${new Date().toISOString().slice(0, 10)}.csv`,
              auditCsv(filtered),
            );
            setNotice(`Exported ${filtered.length} event(s).`);
          })();
        }}
      />
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] text-rose-700">
          {error}
        </p>
      ) : null}
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

      {loading ? (
        <p className="rounded-2xl border border-[#e8eaee] bg-white px-4 py-8 text-center text-[13px] text-[#94a3b8]">
          Loading audit trail…
        </p>
      ) : queueEmpty ? (
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
// --- End: Audit admin live wire (Sachin) ---
