"use client";

import { useState } from "react";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { formatCompact, type DashDonutSlice } from "./dashboard-data";

type Props = {
  slices: DashDonutSlice[];
  rangeLabel: string;
};

const SIZE = 220;
const R_OUTER = 94;
const R_INNER = 56;

type Arc = {
  id: string;
  d: string;
  color: string;
  midAngle: number;
};

function donutArcs(
  slices: DashDonutSlice[],
  cx: number,
  cy: number,
  r: number,
  ir: number,
): Arc[] {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let angle = -Math.PI / 2;
  return slices.map((slice) => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const a1 = angle;
    const a2 = angle + sweep;
    angle = a2;
    const large = sweep > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const ix1 = cx + ir * Math.cos(a2);
    const iy1 = cy + ir * Math.sin(a2);
    const ix2 = cx + ir * Math.cos(a1);
    const iy2 = cy + ir * Math.sin(a1);
    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${ir} ${ir} 0 ${large} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");
    return { id: slice.id, d, color: slice.color, midAngle: (a1 + a2) / 2 };
  });
}

export function DashboardClaimsDonut({ slices, rangeLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((a, s) => a + s.value, 0);
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const arcs = donutArcs(slices, cx, cy, R_OUTER, R_INNER);

  const hovered = hover === null ? null : slices[hover];
  const hoveredArc = hover === null ? null : arcs[hover];
  const rMid = (R_OUTER + R_INNER) / 2;

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-2xl border border-[#e8eaee] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-amber-700/70 uppercase">
        Outcomes
      </p>
      <h2 className="mt-0.5 text-[17px] font-semibold text-[#0f172a]">
        Claims mix
      </h2>
      <p className="mt-0.5 text-[13px] text-slate-500">{rangeLabel}</p>

      <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative shrink-0">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label="Claims outcome donut"
          >
            {arcs.map((arc, i) => (
              <path
                key={arc.id}
                d={arc.d}
                fill={arc.color}
                opacity={hover === null || hover === i ? 1 : 0.45}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[12px] font-medium tracking-wide text-slate-400 uppercase">
              Total
            </p>
            <p className="text-[26px] font-semibold tabular-nums text-slate-900">
              {formatCompact(hovered ? hovered.value : total)}
            </p>
          </div>

          {hovered && hoveredArc ? (
            <ChartTooltip
              title={hovered.label}
              leftPct={
                ((cx + rMid * Math.cos(hoveredArc.midAngle)) / SIZE) * 100
              }
              topPct={((cy + rMid * Math.sin(hoveredArc.midAngle)) / SIZE) * 100}
              rows={[
                {
                  label: "Claims",
                  value: String(hovered.value),
                  dotColor: hovered.color,
                },
                {
                  label: "Share",
                  value:
                    total === 0
                      ? "—"
                      : `${Math.round((hovered.value / total) * 100)}%`,
                },
              ]}
            />
          ) : null}
        </div>

        <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2.5">
          {slices.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 text-[14px]"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="flex items-center gap-2 text-slate-600">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {s.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
