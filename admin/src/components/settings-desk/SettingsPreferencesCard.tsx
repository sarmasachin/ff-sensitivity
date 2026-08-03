"use client";

import { SettingsToggle } from "./SettingsToggle";
import {
  SETTINGS_LANDING_OPTIONS,
  type SettingsPreferences,
} from "./settings-data";

type Props = {
  preferences: SettingsPreferences;
  onChange: (next: SettingsPreferences) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function SettingsPreferencesCard({ preferences, onChange }: Props) {
  function patch(partial: Partial<SettingsPreferences>) {
    onChange({ ...preferences, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-orange-800 uppercase">
        Preferences
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Ops desk defaults
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Local console behavior only. Android remote config stays on the App
        page.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Default landing after login
          <select
            className={fieldClass}
            value={preferences.defaultLanding}
            onChange={(e) => patch({ defaultLanding: e.target.value })}
          >
            {SETTINGS_LANDING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Display timezone
          <input
            className={fieldClass}
            value={preferences.timezoneLabel}
            onChange={(e) => patch({ timezoneLabel: e.target.value })}
            placeholder="Asia/Kolkata (IST)"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <SettingsToggle
          checked={preferences.compactTables}
          onChange={(v) => patch({ compactTables: v })}
          title="Compact tables"
          body="Tighter row padding on list modules."
        />
        <SettingsToggle
          checked={preferences.showInlineNotices}
          onChange={(v) => patch({ showInlineNotices: v })}
          title="Inline action notices"
          body="Show success banners after grant, invite, export, etc."
        />
        <SettingsToggle
          checked={preferences.denseSidebar}
          onChange={(v) => patch({ denseSidebar: v })}
          title="Dense sidebar"
          body="Reduce nav spacing on large monitors."
        />
      </div>
    </section>
  );
}
