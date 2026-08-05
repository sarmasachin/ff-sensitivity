"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchClaims } from "@/components/claims/claims-api";
import type { ClaimResult, RedeemClaimRow } from "./redeem-claims-data";

type Props = {
  open: boolean;
  onClose: () => void;
};

type DrawerResult = ClaimResult | "FLAGGED";

function ResultPill({ result }: { result: DrawerResult }) {
  const map: Record<DrawerResult, string> = {
    SUCCESS: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    FAILED: "bg-rose-100 text-rose-800 ring-rose-200",
    ALREADY_CLAIMED: "bg-amber-100 text-amber-900 ring-amber-200",
    OUT_OF_STOCK: "bg-orange-100 text-orange-900 ring-orange-200",
    FLAGGED: "bg-violet-100 text-violet-900 ring-violet-200",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${map[result]}`}
    >
      {result.replaceAll("_", " ")}
    </span>
  );
}

export function RedeemClaimLogDrawer({ open, onClose }: Props) {
  const [rows, setRows] = useState<RedeemClaimRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<"all" | DrawerResult>("all");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchClaims()
      .then((list) => {
        if (cancelled) return;
        setRows(
          list.map((r) => ({
            id: r.id,
            codeId: r.refId,
            codeTitle: r.title,
            deviceId: r.deviceId,
            result: (r.result === "FLAGGED" ? "FLAGGED" : "SUCCESS") as DrawerResult,
            whenLabel: r.whenLabel,
            stockAfter: r.stockAfter,
          })),
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load claims.");
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (resultFilter !== "all" && r.result !== resultFilter) return false;
      if (!q) return true;
      return (
        r.codeTitle.toLowerCase().includes(q) ||
        r.deviceId.toLowerCase().includes(q)
      );
    });
  }, [rows, query, resultFilter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        aria-label="Close claim log"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl ring-1 ring-slate-200">
        <header className="shrink-0 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-cyan-700 uppercase">
                Activity
              </p>
              <h2 className="mt-1 text-[17px] font-bold text-slate-900">
                Claim log
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                {loading
                  ? "Loading…"
                  : `${rows.length} events · unlock = claim · stock after`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search device or code…"
              className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none focus:border-cyan-400 focus:bg-white"
            />
            <select
              value={resultFilter}
              onChange={(e) =>
                setResultFilter(e.target.value as "all" | DrawerResult)
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700"
            >
              <option value="all">All results</option>
              <option value="SUCCESS">Success</option>
              <option value="FLAGGED">Flagged</option>
            </select>
          </div>
        </header>

        <div className="ops-scroll-hide min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {error ? (
            <p className="rounded-xl border border-dashed border-rose-200 px-4 py-12 text-center text-[13px] text-rose-600">
              {error}
            </p>
          ) : loading ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center text-[13px] text-slate-400">
              Loading claims…
            </p>
          ) : visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center text-[13px] text-slate-400">
              No claims match this filter.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {visible.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-900">
                        {row.codeTitle}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                        {row.deviceId}
                      </p>
                    </div>
                    <ResultPill result={row.result as DrawerResult} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[12px] text-slate-500">
                    <span>{row.whenLabel}</span>
                    <span className="tabular-nums">
                      Stock after:{" "}
                      <strong className="text-slate-800">{row.stockAfter}</strong>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
