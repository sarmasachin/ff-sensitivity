"use client";

import { useEffect, useMemo, useState } from "react";
import { CommunityCapabilities } from "@/components/community/CommunityCapabilities";
import { CommunityDetailDrawer } from "@/components/community/CommunityDetailDrawer";
import { CommunityEmptyState } from "@/components/community/CommunityEmptyState";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityPagination } from "@/components/community/CommunityPagination";
import { CommunityStats } from "@/components/community/CommunityStats";
import { CommunityTable } from "@/components/community/CommunityTable";
import {
  CommunityToolbar,
  type CommunityFilterKey,
} from "@/components/community/CommunityToolbar";
import {
  COMMUNITY_DEMO_ROWS,
  computeCommunityStats,
  type CommunityListRow,
  type CommunityStatus,
} from "@/components/community/community-data";

const PAGE_SIZE = 5;

export default function CommunityPage() {
  const [rows, setRows] = useState<CommunityListRow[]>(() => [
    ...COMMUNITY_DEMO_ROWS,
  ]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CommunityFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const stats = useMemo(() => computeCommunityStats(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "pending" && row.status !== "PENDING") return false;
      if (
        filter === "live" &&
        row.status !== "APPROVED" &&
        row.status !== "FEATURED"
      ) {
        return false;
      }
      if (filter === "featured" && row.status !== "FEATURED") return false;
      if (filter === "hidden" && row.status !== "HIDDEN") return false;
      if (filter === "flagged" && !(row.reports > 0 || row.status === "HIDDEN")) {
        return false;
      }
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.freeFireId.includes(q) ||
        row.deviceLabel.toLowerCase().includes(q) ||
        row.rank.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
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

  function setStatus(id: string, status: CommunityStatus, label: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    setNotice(`${label} “${row.name}”.`);
  }

  const queueEmpty = rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <CommunityHeader
        onRefresh={() =>
          setNotice("Queue refreshed (local demo). API sync comes next.")
        }
      />
      <CommunityStats
        pending={stats.pending}
        live={stats.live}
        featured={stats.featured}
        flagged={stats.flagged}
      />
      <CommunityToolbar
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />

      {queueEmpty ? (
        <CommunityEmptyState kind="queue" />
      ) : filterEmpty ? (
        <CommunityEmptyState
          kind="filter"
          onClearFilter={() => {
            setFilter("all");
            setQuery("");
          }}
        />
      ) : (
        <CommunityTable
          rows={paged}
          notice={notice}
          onInspect={setInspectId}
          onApprove={(id) => setStatus(id, "APPROVED", "Approved")}
          onFeature={(id) => setStatus(id, "FEATURED", "Featured")}
          onHide={(id) => setStatus(id, "HIDDEN", "Hidden")}
          onUnhide={(id) => setStatus(id, "PENDING", "Restored to pending")}
          footer={
            <CommunityPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPage={setPage}
            />
          }
        />
      )}

      <CommunityCapabilities />

      <CommunityDetailDrawer
        open={Boolean(inspectRow)}
        row={inspectRow}
        onClose={() => setInspectId(null)}
      />
    </section>
  );
}
