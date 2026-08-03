"use client";

import type { CopyLegalConfig } from "./copy-data";

type Props = {
  legal: CopyLegalConfig;
  onChange: (next: CopyLegalConfig) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function CopyLegalCard({ legal, onChange }: Props) {
  function patch(partial: Partial<CopyLegalConfig>) {
    onChange({ ...legal, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-800 uppercase">
        Legal
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Link labels
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Visible labels for drawer / footer legal rows. Destination URLs are
        managed on the App page.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Privacy policy
          <input
            className={fieldClass}
            value={legal.privacyLabel}
            onChange={(e) => patch({ privacyLabel: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Terms of use
          <input
            className={fieldClass}
            value={legal.termsLabel}
            onChange={(e) => patch({ termsLabel: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Contact support
          <input
            className={fieldClass}
            value={legal.supportLabel}
            onChange={(e) => patch({ supportLabel: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Play Store rate
          <input
            className={fieldClass}
            value={legal.storeLabel}
            onChange={(e) => patch({ storeLabel: e.target.value })}
          />
        </label>
      </div>
    </section>
  );
}
