"use client";

import { useState } from "react";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import type { DashPoint } from "./dashboard-data";

type Props = {
  points: DashPoint[];
  rangeLabel: string;
};

const W = 720;
const H = 320;
const PAD_X = 16;
const PAD_Y = 24;

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

export function DashboardTrendCard({ points, rangeLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...points.flatMap((p) => [p.claims, p.redeems]));
  const claims = points.map((p) => p.claims);
  const redeems = points.map((p) => p.redeems);
  const claimsLine = buildPath(claims, max);
  const redeemsLine = buildPath(redeems, max);
  const lastX = pointX(points.length - 1, points.length);
  const claimsArea =
    points.length === 0
      ? ""
      : `${claimsLine} L${lastX.toFixed(1)},${H - PAD_Y} L${PAD_X},${H - PAD_Y} Z`;

  const totalClaims = claims.reduce((a, b) => a + b, 0);
  const totalRedeems = redeems.reduce((a, b) => a + b, 0);
  const active = hover === null ? null : points[hover];

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const step = points.length <= 1 ? 1 : (W - PAD_X * 2) / (points.length - 1);
    const idx = Math.round((x - PAD_X) / step);
    setHover(Math.min(points.length - 1, Math.max(0, idx)));
  }

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-2xl border border-[#e8eaee] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-sky-700/70 uppercase">
            Trend
          </p>
          <h2 className="mt-0.5 text-[17px] font-semibold text-[#0f172a]">
            Claims vs redeems
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">{rangeLabel}</p>
        </div>
        <div className="flex gap-4 text-[13px]">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            Claims · {totalClaims}
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Redeems · {totalRedeems}
          </span>
        </div>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div
          className="relative"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-[280px] w-full"
            role="img"
            aria-label="Claims and redeems trend chart"
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
            <path d={claimsArea} fill="rgba(14,165,233,0.12)" />
            <path
              d={claimsLine}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={redeemsLine}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
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
                topPct={(pointY(active.claims, max) / H) * 100}
                colorClass="bg-sky-500"
              />
              <Marker
                leftPct={(pointX(hover, points.length) / W) * 100}
                topPct={(pointY(active.redeems, max) / H) * 100}
                colorClass="bg-emerald-500"
              />
              <ChartTooltip
                title={active.label}
                leftPct={(pointX(hover, points.length) / W) * 100}
                rows={[
                  {
                    label: "Claims",
                    value: String(active.claims),
                    dotClass: "bg-sky-500",
                  },
                  {
                    label: "Redeems",
                    value: String(active.redeems),
                    dotClass: "bg-emerald-500",
                  },
                ]}
              />
            </>
          ) : null}
        </div>

        <div className="mt-2 flex justify-between px-1">
          {points.map((p) => (
            <span
              key={p.label}
              className="text-[11px] font-medium text-slate-400 tabular-nums"
            >
              {p.label}
            </span>
          ))}
        </div>
      </div>
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
