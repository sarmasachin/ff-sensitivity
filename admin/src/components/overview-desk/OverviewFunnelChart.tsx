"use client";

import { useState } from "react";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import type { OverviewSeriesFunnel } from "./overview-data";
import { formatCompact } from "./overview-data";

type Props = {
  funnel: OverviewSeriesFunnel;
  rangeLabel: string;
};

const STEPS: Array<{
  key: keyof OverviewSeriesFunnel;
  label: string;
  tone: string;
  bar: string;
}> = [
  {
    key: "installs",
    label: "Installs",
    tone: "text-slate-900",
    bar: "bg-slate-700",
  },
  {
    key: "firstOpen",
    label: "First open",
    tone: "text-sky-900",
    bar: "bg-sky-500",
  },
  {
    key: "signups",
    label: "Signups",
    tone: "text-indigo-900",
    bar: "bg-indigo-500",
  },
  {
    key: "firstClaims",
    label: "First claim",
    tone: "text-emerald-900",
    bar: "bg-emerald-500",
  },
];

export function OverviewFunnelChart({ funnel, rangeLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const values = STEPS.map((s) => funnel[s.key]);
  const max = Math.max(1, ...values);
  const empty = values.every((v) => v === 0);
  const top = values[0];

  return (
    <section className="flex h-full min-h-[380px] flex-col rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-emerald-700/70 uppercase">
        Funnel
      </p>
      <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
        Conversion · range
      </h2>
      <p className="mt-0.5 text-[12px] text-slate-500">
        {rangeLabel} · install → open → signup → first claim (UTC)
      </p>

      {empty ? (
        <p className="mt-8 text-[13px] text-slate-500">
          No funnel activity in this window yet.
        </p>
      ) : (
        <ul className="mt-5 flex flex-1 flex-col justify-center gap-4">
          {STEPS.map((step, i) => {
            const value = funnel[step.key];
            const prev = i === 0 ? value : values[i - 1];
            const pct =
              i === 0 || prev === 0 ? null : Math.round((value / prev) * 100);
            const widthPct = Math.max(4, (value / max) * 100);
            const rows = [
              { label: step.label, value: String(value), dotClass: step.bar },
            ];
            if (i > 0) {
              rows.push({
                label: "Of previous",
                value: prev === 0 ? "—" : `${Math.round((value / prev) * 100)}%`,
                dotClass: "",
              });
              rows.push({
                label: "Of installs",
                value: top === 0 ? "—" : `${Math.round((value / top) * 100)}%`,
                dotClass: "",
              });
            }
            return (
              <li
                key={step.key}
                className="relative"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium text-slate-600">
                    {step.label}
                  </span>
                  <span className="flex items-baseline gap-2">
                    {pct !== null ? (
                      <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                        {pct}% of prior
                      </span>
                    ) : null}
                    <span
                      className={`text-[15px] font-semibold tabular-nums ${step.tone}`}
                    >
                      {formatCompact(value)}
                    </span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${step.bar} transition-[width,opacity] duration-500`}
                    style={{
                      width: `${widthPct}%`,
                      opacity: hover === null || hover === i ? 1 : 0.55,
                    }}
                  />
                </div>

                {hover === i ? (
                  <ChartTooltip
                    title={step.label}
                    leftPct={widthPct}
                    rows={rows.map((r) => ({
                      label: r.label,
                      value: r.value,
                      dotClass: r.dotClass || undefined,
                    }))}
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
