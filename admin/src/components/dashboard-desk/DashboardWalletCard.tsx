"use client";

import { useState } from "react";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { formatCompact, type DashWalletDay } from "./dashboard-data";

type Props = {
  days: DashWalletDay[];
  rangeLabel: string;
};

export function DashboardWalletCard({ days, rangeLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.flatMap((d) => [d.grant, d.revoke]));
  const grantTotal = days.reduce((a, d) => a + d.grant, 0);
  const revokeTotal = days.reduce((a, d) => a + d.revoke, 0);
  const hovered = hover === null ? null : days[hover];

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-teal-700/70 uppercase">
            Economy
          </p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
            Wallet flow
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">{rangeLabel}</p>
        </div>
        <div className="text-right text-[12px] text-slate-500">
          <p>
            Grant{" "}
            <span className="font-semibold text-teal-800 tabular-nums">
              {formatCompact(grantTotal)}
            </span>
          </p>
          <p>
            Revoke{" "}
            <span className="font-semibold text-rose-700 tabular-nums">
              {formatCompact(revokeTotal)}
            </span>
          </p>
        </div>
      </div>

      <div className="relative mt-5 flex h-[140px] items-end gap-2 sm:gap-3">
        {days.map((d, i) => (
          <div
            key={d.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="flex h-[110px] w-full items-end justify-center gap-0.5">
              <div
                className="w-[42%] max-w-[18px] rounded-t-md bg-teal-500/90 transition-opacity"
                style={{
                  height: `${(d.grant / max) * 100}%`,
                  opacity: hover === null || hover === i ? 1 : 0.5,
                }}
              />
              <div
                className="w-[42%] max-w-[18px] rounded-t-md bg-rose-400/90 transition-opacity"
                style={{
                  height: `${(d.revoke / max) * 100}%`,
                  opacity: hover === null || hover === i ? 1 : 0.5,
                }}
              />
            </div>
            <span className="text-[10px] font-medium text-slate-400">
              {d.label}
            </span>
          </div>
        ))}

        {hovered && hover !== null ? (
          <ChartTooltip
            title={hovered.label}
            leftPct={((hover + 0.5) / Math.max(1, days.length)) * 100}
            rows={[
              {
                label: "Grant",
                value: formatCompact(hovered.grant),
                dotClass: "bg-teal-500",
              },
              {
                label: "Revoke",
                value: formatCompact(hovered.revoke),
                dotClass: "bg-rose-400",
              },
              {
                label: "Net",
                value: formatCompact(hovered.grant - hovered.revoke),
              },
            ]}
            above
          />
        ) : null}
      </div>

      <div className="mt-3 flex gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-teal-500" /> Grant
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-rose-400" /> Revoke
        </span>
      </div>
    </section>
  );
}
