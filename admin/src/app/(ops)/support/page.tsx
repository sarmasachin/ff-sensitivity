"use client";

import { useEffect, useMemo, useState } from "react";
import { SupportCapabilities } from "@/components/support/SupportCapabilities";
import { SupportEmptyState } from "@/components/support/SupportEmptyState";
import { SupportHeader } from "@/components/support/SupportHeader";
import { SupportPagination } from "@/components/support/SupportPagination";
import { SupportStats } from "@/components/support/SupportStats";
import { SupportTable } from "@/components/support/SupportTable";
import { SupportThreadDrawer } from "@/components/support/SupportThreadDrawer";
import {
  SupportToolbar,
  type SupportFilterKey,
} from "@/components/support/SupportToolbar";
import {
  SUPPORT_DEMO_ROWS,
  computeSupportStats,
  type SupportThreadRow,
} from "@/components/support/support-data";

const PAGE_SIZE = 5;

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SupportPage() {
  const [rows, setRows] = useState<SupportThreadRow[]>(() => [
    ...SUPPORT_DEMO_ROWS,
  ]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SupportFilterKey>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const stats = useMemo(() => computeSupportStats(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "open") {
        if (row.status !== "OPEN" && row.status !== "PENDING_REPLY") {
          return false;
        }
      }
      if (filter === "unread" && !row.unread) return false;
      if (filter === "replied" && row.status !== "REPLIED") return false;
      if (filter === "closed" && row.status !== "CLOSED") return false;
      if (filter === "bug" && row.subject !== "BUG") return false;
      if (filter === "redeem" && row.subject !== "REDEEM_CODE_ISSUE") {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.name,
        row.email,
        row.subject,
        row.deviceLabel,
        row.appVersion,
        ...row.messages.map((m) => m.text),
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

  const inspectRow = inspectId
    ? (rows.find((r) => r.id === inspectId) ?? null)
    : null;

  const queueEmpty = rows.length === 0;
  const filterEmpty = !queueEmpty && filtered.length === 0;

  function closeThread(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "CLOSED", unread: false, updatedAt: nowStamp() }
          : r,
      ),
    );
    setNotice(`Closed thread with ${row.name}.`);
    if (inspectId === id) setInspectId(null);
  }

  function markRead(id: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, unread: false } : r)),
    );
  }

  function reply(id: string, text: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const stamp = nowStamp();
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "REPLIED",
              unread: false,
              updatedAt: stamp,
              messages: [
                ...r.messages,
                {
                  id: `m_${Date.now().toString(36)}`,
                  sender: "ADMIN",
                  text,
                  createdAt: stamp,
                },
              ],
            }
          : r,
      ),
    );
    setNotice(`Replied to ${row.name}.`);
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <SupportHeader
        onRefresh={() =>
          setNotice("Inbox refreshed (local demo). API sync comes next.")
        }
      />
      <SupportStats
        total={stats.total}
        open={stats.open}
        unread={stats.unread}
        replied={stats.replied}
        closed={stats.closed}
      />

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-[13px] font-medium text-sky-950"
        >
          {notice}
        </div>
      ) : null}

      <SupportToolbar
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />

      {queueEmpty ? (
        <SupportEmptyState
          title="Inbox empty"
          body="New Contact Us threads from Android will appear here."
        />
      ) : filterEmpty ? (
        <SupportEmptyState
          title="No matches"
          body="Try another search or filter."
        />
      ) : (
        <>
          <SupportTable
            rows={paged}
            onOpen={setInspectId}
            onCloseThread={closeThread}
          />
          <SupportPagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </>
      )}

      <SupportCapabilities />

      <SupportThreadDrawer
        open={Boolean(inspectId)}
        row={inspectRow}
        onClose={() => setInspectId(null)}
        onReply={reply}
        onMarkRead={markRead}
      />
    </section>
  );
}
