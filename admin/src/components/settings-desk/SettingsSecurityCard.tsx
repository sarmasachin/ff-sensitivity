"use client";

import { SettingsToggle } from "./SettingsToggle";
import type { SettingsSecurity } from "./settings-data";

type Props = {
  security: SettingsSecurity;
  onChange: (next: SettingsSecurity) => void;
  canMutate: boolean;
  purgeBusy?: boolean;
  onPurgeNow?: () => void;
};

const labelClass = "block text-[11px] font-semibold text-slate-600";
const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10";
const areaClass =
  "mt-1 w-full resize-none rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10";

export function SettingsSecurityCard({
  security,
  onChange,
  canMutate,
  purgeBusy,
  onPurgeNow,
}: Props) {
  function patch(partial: Partial<SettingsSecurity>) {
    onChange({ ...security, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-orange-800 uppercase">
        Security
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Step-up, export & audit retention
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Sensitive mutations can require a fresh password. Audit stays
        append-only — purge only removes rows older than retention.
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

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
        <p className="text-[13px] font-semibold text-slate-900">
          Audit trail retention
        </p>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Default 90 days. Auto-purge runs about hourly when enabled. Run now
          uses the same cutoff — never wipe-all.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Keep logs (days)
            <input
              type="number"
              min={7}
              max={3650}
              className={fieldClass}
              value={security.auditRetentionDays}
              onChange={(e) =>
                patch({
                  auditRetentionDays: Math.max(
                    7,
                    Math.min(3650, Number(e.target.value) || 7),
                  ),
                })
              }
              disabled={!canMutate}
            />
          </label>
          <div className="flex flex-col justify-end">
            <SettingsToggle
              checked={security.auditAutoPurge}
              onChange={(v) => patch({ auditAutoPurge: v })}
              title="Auto-purge older logs"
              body="Hourly job deletes rows past retention."
            />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Last purge:{" "}
          {security.lastAuditPurgeAt
            ? new Date(security.lastAuditPurgeAt).toLocaleString()
            : "Never"}
        </p>
        {canMutate && onPurgeNow ? (
          <button
            type="button"
            disabled={purgeBusy}
            onClick={onPurgeNow}
            className="mt-3 h-9 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {purgeBusy ? "Purging…" : "Run purge now"}
          </button>
        ) : null}
      </div>

      <label className={`${labelClass} mt-4`}>
        IP allowlist note
        <textarea
          rows={3}
          className={areaClass}
          value={security.ipAllowlistNote}
          onChange={(e) => patch({ ipAllowlistNote: e.target.value })}
          placeholder="Document current IP policy for ops…"
          disabled={!canMutate}
        />
      </label>
    </section>
  );
}
