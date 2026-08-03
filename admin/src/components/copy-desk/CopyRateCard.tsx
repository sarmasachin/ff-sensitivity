"use client";

import type { CopyRateConfig } from "./copy-data";

type Props = {
  rate: CopyRateConfig;
  onChange: (next: CopyRateConfig) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";
const areaClass =
  "mt-1 w-full resize-none rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";

export function CopyRateCard({ rate, onChange }: Props) {
  function patch(partial: Partial<CopyRateConfig>) {
    onChange({ ...rate, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-800 uppercase">
            Rate
          </p>
          <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
            Play Store rate prompt
          </h2>
          <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
            In-app dialog after enough sessions. Keep it short — one ask, two
            buttons.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[12px] font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={rate.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500/40"
          />
          Prompt enabled
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Title
          <input
            className={fieldClass}
            value={rate.title}
            onChange={(e) => patch({ title: e.target.value })}
            disabled={!rate.enabled}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Body
          <textarea
            rows={3}
            className={areaClass}
            value={rate.body}
            onChange={(e) => patch({ body: e.target.value })}
            disabled={!rate.enabled}
          />
        </label>
        <label className={labelClass}>
          Primary CTA
          <input
            className={fieldClass}
            value={rate.primaryCta}
            onChange={(e) => patch({ primaryCta: e.target.value })}
            disabled={!rate.enabled}
          />
        </label>
        <label className={labelClass}>
          Secondary CTA
          <input
            className={fieldClass}
            value={rate.secondaryCta}
            onChange={(e) => patch({ secondaryCta: e.target.value })}
            disabled={!rate.enabled}
          />
        </label>
        <label className={labelClass}>
          Min sessions before show
          <input
            type="number"
            min={1}
            className={fieldClass}
            value={rate.minSessions}
            onChange={(e) =>
              patch({
                minSessions: Math.max(1, Number(e.target.value) || 1),
              })
            }
            disabled={!rate.enabled}
          />
        </label>
      </div>
    </section>
  );
}
