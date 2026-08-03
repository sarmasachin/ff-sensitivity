"use client";

import type { CopyShareConfig } from "./copy-data";

type Props = {
  share: CopyShareConfig;
  onChange: (next: CopyShareConfig) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";
const areaClass =
  "mt-1 w-full resize-none rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 font-mono text-[12px] leading-relaxed text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";

export function CopyShareCard({ share, onChange }: Props) {
  function patch(partial: Partial<CopyShareConfig>) {
    onChange({ ...share, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-800 uppercase">
        Share
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Sensitivity share sheet
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Android share intent text. Use{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
          {"{{device}}"}
        </code>{" "}
        and{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
          {"{{settings}}"}
        </code>{" "}
        — settings is required.
      </p>

      <div className="mt-5 space-y-3">
        <label className={labelClass}>
          Sheet title
          <input
            className={fieldClass}
            value={share.sheetTitle}
            onChange={(e) => patch({ sheetTitle: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Body template
          <textarea
            rows={6}
            className={areaClass}
            value={share.bodyTemplate}
            onChange={(e) => patch({ bodyTemplate: e.target.value })}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Footer line
            <input
              className={`${fieldClass} font-mono`}
              value={share.footerLine}
              onChange={(e) => patch({ footerLine: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Hashtags
            <input
              className={fieldClass}
              value={share.hashtags}
              onChange={(e) => patch({ hashtags: e.target.value })}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
