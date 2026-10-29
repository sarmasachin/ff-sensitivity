"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchShopPurchases } from "./shop-api";
import type { ShopPurchaseRow } from "./shop-data";

const PAGE_SIZE = 12;

function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function ShopPurchasesPanel() {
  const [rows, setRows] = useState<ShopPurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    fetchShopPurchases()
      .then((next) => {
        if (!cancel) setRows(next);
      })
      .catch((e: unknown) => {
        if (!cancel) {
          setError(e instanceof Error ? e.message : "Failed to load purchases.");
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.googleName,
        row.displayName,
        row.email,
        row.userId,
        row.itemTitle,
        row.itemId,
        row.deviceId,
        row.deviceLabel,
        row.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-[#e8eaee] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-slate-600">
          <span className="font-semibold text-slate-900 tabular-nums">
            {rows.length}
          </span>{" "}
          shop buys on file. One-time items are unlocks.
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search user, email, item, device…"
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-[13px] outline-none focus:border-indigo-500 focus:bg-white sm:max-w-sm"
        />
      </div>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-500">Loading purchases…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-[#e8eaee] bg-white px-5 py-10 text-center text-[13px] text-slate-500">
          {rows.length === 0
            ? "No shop purchases yet."
            : "No purchase matches that search."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3">Coins</th>
                  <th className="px-4 py-3">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#f1f5f9] last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3.5 text-[12px] whitespace-nowrap text-slate-600">
                      {whenLabel(row.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-medium text-[#0f172a]">
                        {row.googleName || row.displayName}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-600">{row.email}</p>
                      {row.googleName &&
                      row.displayName &&
                      row.googleName !== row.displayName ? (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          App name: {row.displayName}
                        </p>
                      ) : null}
                      {row.deviceLabel || row.deviceId ? (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {row.deviceLabel || row.deviceId}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-medium text-[#0f172a]">
                        {row.itemTitle}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                        {row.itemId}
                        {row.category ? ` · ${row.category}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={[
                          "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
                          row.oneTime
                            ? "bg-amber-50 text-amber-800 ring-amber-200"
                            : "bg-slate-100 text-slate-700 ring-slate-200",
                        ].join(" ")}
                      >
                        {row.oneTime ? "Unlock" : "Buy"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-semibold whitespace-nowrap text-amber-700 tabular-nums">
                      {row.coins.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] tabular-nums text-slate-700">
                      {row.balanceAfter.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-800 tabular-nums">
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800 tabular-nums">
                {filtered.length}
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 text-[12px] font-semibold text-slate-600 tabular-nums">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
