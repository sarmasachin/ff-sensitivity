"use client";

import { AppControlToggle } from "./AppControlToggle";
import type { AppStatusConfig } from "./app-control-data";

type Props = {
  status: AppStatusConfig;
  onChange: (next: AppStatusConfig) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function AppControlStatusCard({ status, onChange }: Props) {
  function patch(partial: Partial<AppStatusConfig>) {
    onChange({ ...status, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-emerald-800 uppercase">
        Status
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Maintenance & update gate
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Gate the whole app or clients below the minimum version. Soft prompt
        remains optional when force-update is off.
      </p>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <AppControlToggle
          checked={status.maintenanceMode}
          onChange={(v) => patch({ maintenanceMode: v })}
          title="Maintenance mode"
          body="Show a blocking screen with the message below."
          danger
        />
        <AppControlToggle
          checked={status.forceUpdate}
          onChange={(v) => patch({ forceUpdate: v })}
          title="Force update"
          body="Clients below min version must open Play Store."
          danger
        />
        <AppControlToggle
          checked={status.softUpdatePrompt}
          onChange={(v) => patch({ softUpdatePrompt: v })}
          title="Soft update prompt"
          body="Optional banner when a newer build is available."
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Min version code
          <input
            type="number"
            min={1}
            className={fieldClass}
            value={status.minVersionCode}
            onChange={(e) =>
              patch({
                minVersionCode: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </label>
        <label className={labelClass}>
          Min version name
          <input
            className={`${fieldClass} font-mono`}
            value={status.minVersionName}
            onChange={(e) => patch({ minVersionName: e.target.value })}
            placeholder="2.4.1"
          />
        </label>
      </div>

      <label className={`${labelClass} mt-3`}>
        Maintenance message
        <textarea
          rows={3}
          className="mt-1 w-full resize-none rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          value={status.maintenanceMessage}
          onChange={(e) => patch({ maintenanceMessage: e.target.value })}
          disabled={!status.maintenanceMode}
        />
      </label>
    </section>
  );
}
