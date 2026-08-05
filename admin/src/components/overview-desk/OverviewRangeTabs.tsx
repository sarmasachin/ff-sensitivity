"use client";

import {
  OVERVIEW_RANGE_TABS,
  type OverviewSeriesRange,
} from "./overview-data";

type Props = {
  active: OverviewSeriesRange;
  onChange: (id: OverviewSeriesRange) => void;
  disabled?: boolean;
};

export function OverviewRangeTabs({ active, onChange, disabled }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Overview chart range"
      className="flex flex-wrap gap-1.5 rounded-2xl border border-[#e8eaee] bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      {OVERVIEW_RANGE_TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(tab.id)}
            className={[
              "flex min-w-[100px] flex-1 flex-col items-start rounded-xl px-4 py-2.5 text-left transition-colors",
              selected
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50",
              disabled ? "opacity-60" : "",
            ].join(" ")}
          >
            <span className="text-[13px] font-semibold">{tab.label}</span>
            <span
              className={[
                "mt-0.5 text-[11px]",
                selected ? "text-white/70" : "text-slate-400",
              ].join(" ")}
            >
              {tab.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
