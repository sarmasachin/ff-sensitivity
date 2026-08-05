"use client";

import { useState } from "react";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import type { OverviewSeriesPoint } from "./overview-data";
import { formatCompact } from "./overview-data";

type Props = {
  points: OverviewSeriesPoint[];
  rangeLabel: string;
};

const W = 720;
const H = 260;
const PAD_X = 18;
const PAD_Y = 22;

function pointX(i: number, n: number): number {
  if (n <= 1) return PAD_X;
  return PAD_X + ((W - PAD_X * 2) / (n - 1)) * i;
}

function pointY(v: number, max: number): number {
  const innerH = H - PAD_Y * 2;
  return PAD_Y + innerH - (v / max) * innerH;
}

function buildPath(values: number[], max: number): string {
  if (values.length === 0) return "";
  return values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${pointX(i, values.length).toFixed(1)},${pointY(
          v,
          max,
        ).toFixed(1)}`,
    )
    .join(" ");
}

/** Sparse x-axis labels so 30d stays readable. */
function labelIndexes(n: number): Set<number> {
  if (n <= 8) return new Set(Array.from({ length: n }, (_, i) => i));
  const set = new Set<number>([0, n - 1]);
  const step = Math.ceil((n - 1) / 5);
  for (let i = step; i < n - 1; i += step) set.add(i);
  return set;
}

export function OverviewTrendCard({ points, rangeLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...points.flatMap((p) => [p.dau, p.claims]));
  const dau = points.map((p) => p.dau);
  const claims = points.map((p) => p.claims);
  const dauLine = buildPath(dau, max);
  const claimsLine = buildPath(claims, max);
  const lastX = pointX(points.length - 1, points.length);
  const dauArea =
    points.length === 0
      ? ""
      : `${dauLine} L${lastX.toFixed(1)},${H - PAD_Y} L${PAD_X},${H - PAD_Y} Z`;

  const totalDau = dau.reduce((a, b) => a + b, 0);
  const totalClaims = claims.reduce((a, b) => a + b, 0);
  const show = labelIndexes(points.length);
  const empty = points.every((p) => p.dau === 0 && p.claims === 0);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const step = points.length <= 1 ? 1 : (W - PAD_X * 2) / (points.length - 1);
    const idx = Math.round((x - PAD_X) / step);
    setHover(Math.min(points.length - 1, Math.max(0, idx)));
  }

  const active = hover === null ? null : points[hover];

  return (
    <section className="flex h-full min-h-[380px] flex-col rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-sky-700/70 uppercase">
            Trend
          </p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
            DAU vs claims
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">{rangeLabel} · UTC</p>
        </div>
        <div className="flex flex-wrap gap-4 text-[13px]">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            DAU · {formatCompact(totalDau)}
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Claims · {formatCompact(totalClaims)}
          </span>
        </div>
      </div>

      {empty ? (
        <p className="mt-8 text-[13px] text-slate-500">
          No opens or claims in this window yet — open the app or redeem a
          code.
        </p>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div
            className="relative"
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="h-[220px] w-full"
              role="img"
              aria-label="DAU and claims trend chart"
            >
              {[0.25, 0.5, 0.75].map((t) => {
                const y = PAD_Y + (H - PAD_Y * 2) * (1 - t);
                return (
                  <line
                    key={t}
                    x1={PAD_X}
                    x2={W - PAD_X}
                    y1={y}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              <path d={dauArea} fill="rgba(14,165,233,0.10)" />
              <path
                d={dauLine}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={claimsLine}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {hover !== null ? (
                <line
                  x1={pointX(hover, points.length)}
                  x2={pointX(hover, points.length)}
                  y1={PAD_Y}
                  y2={H - PAD_Y}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>

            {active && hover !== null ? (
              <>
                <Marker
                  leftPct={(pointX(hover, points.length) / W) * 100}
                  topPct={(pointY(active.dau, max) / H) * 100}
                  colorClass="bg-sky-500"
                />
                <Marker
                  leftPct={(pointX(hover, points.length) / W) * 100}
                  topPct={(pointY(active.claims, max) / H) * 100}
                  colorClass="bg-emerald-500"
                />
                <ChartTooltip
                  title={active.label}
                  leftPct={(pointX(hover, points.length) / W) * 100}
                  rows={[
                    {
                      label: "DAU",
                      value: String(active.dau),
                      dotClass: "bg-sky-500",
                    },
                    {
                      label: "Claims",
                      value: String(active.claims),
                      dotClass: "bg-emerald-500",
                    },
                  ]}
                />
              </>
            ) : null}
          </div>

          <div className="mt-1 flex justify-between px-0.5">
            {points.map((p, i) => (
              <span
                key={p.day}
                className="min-w-0 flex-1 text-center text-[10px] font-medium text-slate-400 tabular-nums"
              >
                {show.has(i) ? p.label : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Marker({
  leftPct,
  topPct,
  colorClass,
}: {
  leftPct: number;
  topPct: number;
  colorClass: string;
}) {
  return (
    <span
      className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${colorClass}`}
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
    />
  );
}
