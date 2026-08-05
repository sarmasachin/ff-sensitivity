"use client";

import { useState } from "react";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import type { OverviewSeriesScreen } from "./overview-data";
import { formatCompact } from "./overview-data";

type Props = {
  screens: OverviewSeriesScreen[];
  rangeLabel: string;
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s === 0 ? `${m}m` : `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm === 0 ? `${h}h` : `${h}h ${rm}m`;
}

export function OverviewScreensChart({ screens, rangeLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...screens.map((s) => s.seconds));
  const totalSeconds = screens.reduce((a, s) => a + s.seconds, 0);

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-teal-700/70 uppercase">
            Screens
          </p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
            Top screen time
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {rangeLabel} · from screen_session events
          </p>
        </div>
      </div>

      {screens.length === 0 ? (
        <p className="mt-6 text-[13px] text-slate-500">
          No screen sessions in this window yet.
        </p>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {screens.map((row, i) => {
            const widthPct = Math.max(6, (row.seconds / max) * 100);
            const share =
              totalSeconds === 0
                ? "—"
                : `${Math.round((row.seconds / totalSeconds) * 100)}%`;
            const avg =
              row.visits === 0
                ? "—"
                : formatDuration(Math.round(row.seconds / row.visits));
            return (
              <li
                key={row.screen}
                className="relative"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[12px] font-medium text-slate-700">
                    {row.screen}
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums text-slate-900">
                    {formatDuration(row.seconds)}
                    <span className="ml-1.5 font-medium text-slate-400">
                      · {formatCompact(row.visits)} visits
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-[width,opacity] duration-500"
                    style={{
                      width: `${widthPct}%`,
                      opacity: hover === null || hover === i ? 1 : 0.55,
                    }}
                  />
                </div>

                {hover === i ? (
                  <ChartTooltip
                    title={row.screen}
                    leftPct={widthPct}
                    rows={[
                      {
                        label: "Time",
                        value: formatDuration(row.seconds),
                        dotClass: "bg-teal-500",
                      },
                      { label: "Seconds", value: String(row.seconds) },
                      { label: "Visits", value: String(row.visits) },
                      { label: "Avg / visit", value: avg },
                      { label: "Share", value: share },
                    ]}
                    above
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
