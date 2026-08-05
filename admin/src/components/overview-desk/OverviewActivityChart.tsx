"use client";

import { useState } from "react";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import type { OverviewSeriesPoint } from "./overview-data";
import { formatCompact } from "./overview-data";

type Props = {
  points: OverviewSeriesPoint[];
  rangeLabel: string;
};

const W = 340;
const H = 150;
const PAD_X = 10;
const PAD_Y = 14;

type PanelProps = {
  eyebrow: string;
  title: string;
  valueLabel: string;
  dotClass: string;
  color: string;
  fill: string;
  kind: "bar" | "area";
  points: OverviewSeriesPoint[];
  values: number[];
};

function barSlot(n: number): { slot: number; barW: number } {
  const innerW = W - PAD_X * 2;
  const slot = innerW / Math.max(1, n);
  return { slot, barW: Math.max(2, Math.min(18, slot * 0.62)) };
}

function areaX(i: number, n: number): number {
  if (n <= 1) return PAD_X;
  return PAD_X + ((W - PAD_X * 2) / (n - 1)) * i;
}

function valueY(v: number, max: number): number {
  const innerH = H - PAD_Y * 2;
  return PAD_Y + innerH - (max === 0 ? 0 : (v / max) * innerH);
}

function Panel({
  eyebrow,
  title,
  valueLabel,
  dotClass,
  color,
  fill,
  kind,
  points,
  values,
}: PanelProps) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const n = values.length;
  const { slot, barW } = barSlot(n);

  const line = values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${areaX(i, n).toFixed(1)},${valueY(v, max).toFixed(1)}`,
    )
    .join(" ");
  const area =
    n === 0
      ? ""
      : `${line} L${areaX(n - 1, n).toFixed(1)},${H - PAD_Y} L${PAD_X},${H - PAD_Y} Z`;

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const idx =
      kind === "bar"
        ? Math.floor((x - PAD_X) / slot)
        : Math.round((x - PAD_X) / (n <= 1 ? 1 : (W - PAD_X * 2) / (n - 1)));
    setHover(Math.min(n - 1, Math.max(0, idx)));
  }

  const hoverX =
    hover === null
      ? 0
      : kind === "bar"
        ? PAD_X + slot * hover + slot / 2
        : areaX(hover, n);

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
            {eyebrow}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-800">
            {title}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-slate-900">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
          {formatCompact(total)}
        </span>
      </div>

      <div
        className="relative mt-3"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[130px] w-full"
          role="img"
          aria-label={`${title} chart`}
        >
          {[0.5, 1].map((t) => {
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

          {kind === "bar"
            ? values.map((v, i) => {
                const barH = (v / max) * (H - PAD_Y * 2);
                return (
                  <rect
                    key={i}
                    x={(PAD_X + slot * i + (slot - barW) / 2).toFixed(1)}
                    y={(PAD_Y + (H - PAD_Y * 2) - barH).toFixed(1)}
                    width={barW.toFixed(1)}
                    height={Math.max(v > 0 ? 2 : 0, barH).toFixed(1)}
                    rx={Math.min(3, barW / 2).toFixed(1)}
                    fill={color}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                );
              })
            : null}

          {kind === "area" ? (
            <>
              <path d={area} fill={fill} />
              <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}

          {hover !== null ? (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD_Y}
              y2={H - PAD_Y}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        {hover !== null ? (
          <>
            {kind === "area" ? (
              <span
                className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${dotClass}`}
                style={{
                  left: `${(hoverX / W) * 100}%`,
                  top: `${(valueY(values[hover], max) / H) * 100}%`,
                }}
              />
            ) : null}
            <ChartTooltip
              title={points[hover]?.label ?? ""}
              leftPct={(hoverX / W) * 100}
              rows={[
                {
                  label: valueLabel,
                  value: String(values[hover]),
                  dotClass,
                },
              ]}
            />
          </>
        ) : null}
      </div>

      <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400 tabular-nums">
        <span>{points[0]?.label ?? ""}</span>
        <span>{points[points.length - 1]?.label ?? ""}</span>
      </div>
    </div>
  );
}

/** Signups + screen visits per UTC day — each panel keeps its own scale. */
export function OverviewActivityChart({ points, rangeLabel }: Props) {
  const signups = points.map((p) => p.signups);
  const visits = points.map((p) => p.screenVisits);
  const empty =
    points.length === 0 ||
    (signups.every((v) => v === 0) && visits.every((v) => v === 0));

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-indigo-700/70 uppercase">
            Activity
          </p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
            Signups &amp; screen visits
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {rangeLabel} · UTC daily · separate scales so both stay readable
          </p>
        </div>
      </div>

      {empty ? (
        <p className="mt-6 text-[13px] text-slate-500">
          No signups or screen visits in this window yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel
            eyebrow="Accounts"
            title="Signups per day"
            valueLabel="Signups"
            dotClass="bg-indigo-500"
            color="#6366f1"
            fill="rgba(99,102,241,0.12)"
            kind="bar"
            points={points}
            values={signups}
          />
          <Panel
            eyebrow="Usage"
            title="Screen visits per day"
            valueLabel="Screen visits"
            dotClass="bg-teal-500"
            color="#14b8a6"
            fill="rgba(20,184,166,0.12)"
            kind="area"
            points={points}
            values={visits}
          />
        </div>
      )}
    </section>
  );
}
