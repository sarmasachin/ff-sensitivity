"use client";

import { SettingsToggle } from "./SettingsToggle";
import type { SettingsSecurity } from "./settings-data";

type Props = {
  security: SettingsSecurity;
  onChange: (next: SettingsSecurity) => void;
};

const labelClass = "block text-[11px] font-semibold text-slate-600";
const areaClass =
  "mt-1 w-full resize-none rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10";

export function SettingsSecurityCard({ security, onChange }: Props) {
  function patch(partial: Partial<SettingsSecurity>) {
    onChange({ ...security, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-orange-800 uppercase">
        Security
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Step-up & export policy
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Sensitive mutations can require a fresh password even with a valid
        session. Seat ACL still lives on Staff.
      </p>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <SettingsToggle
          checked={security.requireReauthForReveal}
          onChange={(v) => patch({ requireReauthForReveal: v })}
          title="Reauth for code reveal"
          body="Password again before showing a full redeem secret."
        />
        <SettingsToggle
          checked={security.requireReauthForStaffInvite}
          onChange={(v) => patch({ requireReauthForStaffInvite: v })}
          title="Reauth for staff invite"
          body="Step-up before creating Admin / Sub-Admin / Viewer seats."
        />
        <SettingsToggle
          checked={security.requireReauthForWalletAdjust}
          onChange={(v) => patch({ requireReauthForWalletAdjust: v })}
          title="Reauth for wallet adjust"
          body="Step-up before grant / revoke coins."
        />
        <SettingsToggle
          checked={security.allowViewerCsvExport}
          onChange={(v) => patch({ allowViewerCsvExport: v })}
          title="Allow Viewer CSV export"
          body="When off, Viewer role can browse but cannot export."
        />
      </div>

      <label className={`${labelClass} mt-4`}>
        IP allowlist note
        <textarea
          rows={3}
          className={areaClass}
          value={security.ipAllowlistNote}
          onChange={(e) => patch({ ipAllowlistNote: e.target.value })}
          placeholder="Document current IP policy for ops…"
        />
      </label>
    </section>
  );
}
