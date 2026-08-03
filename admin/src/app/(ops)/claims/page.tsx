"use client";

import { useEffect, useMemo, useState } from "react";
import { ClaimsCapabilities } from "@/components/claims/ClaimsCapabilities";
import { ClaimsDetailDrawer } from "@/components/claims/ClaimsDetailDrawer";
import { ClaimsEmptyState } from "@/components/claims/ClaimsEmptyState";
import { ClaimsHeader } from "@/components/claims/ClaimsHeader";
import { ClaimsPagination } from "@/components/claims/ClaimsPagination";
import { ClaimsPolicyCard } from "@/components/claims/ClaimsPolicyCard";
import { ClaimsStats } from "@/components/claims/ClaimsStats";
import { ClaimsTable } from "@/components/claims/ClaimsTable";
import {
  ClaimsToolbar,
  type ClaimsFilterKey,
} from "@/components/claims/ClaimsToolbar";
import {
  CLAIMS_DEMO_ROWS,
  computeClaimStats,
  type ClaimListRow,
} from "@/components/claims/claims-data";

const PAGE_SIZE = 5;

export default function ClaimsPage() {
  const [rows, setRows] = useState<ClaimListRow[]>(() => [...CLAIMS_DEMO_ROWS]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClaimsFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const stats = useMemo(() => computeClaimStats(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "copied" && row.result !== "SUCCESS") return false;
      if (
        filter === "blocked" &&
        row.result !== "ALREADY_CLAIMED" &&
        row.result !== "COPY_FAILED"
      ) {
        return false;
      }
      if (
        filter === "abuse" &&
        !(row.result === "FLAGGED" || row.abuseScore >= 60)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        row.deviceId.toLowerCase().includes(q) ||
        row.refId.toLowerCase().includes(q) ||
        row.codeMasked.toLowerCase().includes(q) ||
        row.note.toLowerCase().includes(q)
      );
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

  const inspectRow = inspectId
    ? (rows.find((r) => r.id === inspectId) ?? null)
    : null;

  function flagClaim(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              result: "FLAGGED",
              abuseScore: Math.max(r.abuseScore, 75),
              note: `${r.note} · Manually flagged by staff.`,
            }
          : r,
      ),
    );
    setNotice(`Flagged “${row.title}” for abuse review.`);
  }

  function clearFlag(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              result: "SUCCESS",
              abuseScore: Math.min(r.abuseScore, 15),
              note: "Cleared by staff after review. Copy claim stands.",
            }
          : r,
      ),
    );
    setNotice(`Cleared flag on “${row.title}”.`);
  }

  function deleteClaim(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const ok = window.confirm(
      `Delete claim for “${row.title}” (${row.codeMasked})? This cannot be undone.`,
    );
    if (!ok) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (inspectId === id) setInspectId(null);
    setNotice(`Deleted claim for “${row.title}”.`);
  }

  const queueEmpty = rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <ClaimsHeader
        onExport={() =>
          setNotice("CSV export will work after Claims API is connected.")
        }
      />
      <ClaimsPolicyCard />
      <ClaimsStats
        copied={stats.copied}
        blocked={stats.blocked}
        flagged={stats.flagged}
        devices={stats.devices}
      />
      <ClaimsToolbar
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />

      {queueEmpty ? (
        <ClaimsEmptyState kind="queue" />
      ) : filterEmpty ? (
        <ClaimsEmptyState
          kind="filter"
          onClearFilter={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      ) : (
        <ClaimsTable
          rows={paged}
          notice={notice}
          onInspect={setInspectId}
          onFlag={flagClaim}
          onClear={clearFlag}
          onDelete={deleteClaim}
          footer={
            <ClaimsPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPage={setPage}
            />
          }
        />
      )}

      <ClaimsCapabilities />

      <ClaimsDetailDrawer
        open={Boolean(inspectRow)}
        row={inspectRow}
        onClose={() => setInspectId(null)}
      />
    </section>
  );
}
