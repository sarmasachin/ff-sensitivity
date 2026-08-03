"use client";

import type { CopyAboutConfig } from "./copy-data";

type Props = {
  about: CopyAboutConfig;
  onChange: (next: CopyAboutConfig) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";
const areaClass =
  "mt-1 w-full resize-none rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";

export function CopyAboutCard({ about, onChange }: Props) {
  function patch(partial: Partial<CopyAboutConfig>) {
    onChange({ ...about, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-800 uppercase">
        About
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        About screen blurbs
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Headline and description on the in-app About page, plus CTA labels for
        website and privacy (URLs stay on App → Links).
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Headline
          <input
            className={fieldClass}
            value={about.headline}
            onChange={(e) => patch({ headline: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Version prefix
          <input
            className={fieldClass}
            value={about.versionPrefix}
            onChange={(e) => patch({ versionPrefix: e.target.value })}
            placeholder="Version"
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Blurb
          <textarea
            rows={4}
            className={areaClass}
            value={about.blurb}
            onChange={(e) => patch({ blurb: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Website CTA
          <input
            className={fieldClass}
            value={about.websiteCta}
            onChange={(e) => patch({ websiteCta: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Privacy CTA
          <input
            className={fieldClass}
            value={about.privacyCta}
            onChange={(e) => patch({ privacyCta: e.target.value })}
          />
        </label>
      </div>
    </section>
  );
}
