"use client";

import type { AppLinksConfig } from "./app-control-data";

type Props = {
  links: AppLinksConfig;
  onChange: (next: AppLinksConfig) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 font-mono text-[13px] text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function AppControlLinksCard({ links, onChange }: Props) {
  function patch(partial: Partial<AppLinksConfig>) {
    onChange({ ...links, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-emerald-800 uppercase">
        Links
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Store & legal destinations
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Pushed to Android About, force-update CTA, and share footers. Defaults
        match current AppLinks.kt.
      </p>

      <div className="mt-5 space-y-3">
        <label className={labelClass}>
          Play Store URL
          <input
            className={fieldClass}
            value={links.playStoreUrl}
            onChange={(e) => patch({ playStoreUrl: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Privacy policy URL
          <input
            className={fieldClass}
            value={links.privacyUrl}
            onChange={(e) => patch({ privacyUrl: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Website URL
          <input
            className={fieldClass}
            value={links.websiteUrl}
            onChange={(e) => patch({ websiteUrl: e.target.value })}
          />
        </label>
        <label className={labelClass}>
          Support email
          <input
            type="email"
            className={fieldClass}
            value={links.supportEmail}
            onChange={(e) => patch({ supportEmail: e.target.value })}
          />
        </label>
      </div>
    </section>
  );
}
