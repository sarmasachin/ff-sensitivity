"use client";

import { SettingsToggle } from "./SettingsToggle";
import type { SettingsSession } from "./settings-data";

type Props = {
  session: SettingsSession;
  onChange: (next: SettingsSession) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function SettingsSessionCard({ session, onChange }: Props) {
  function patch(partial: Partial<SettingsSession>) {
    onChange({ ...session, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-orange-800 uppercase">
        Session
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Session policy
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        How long ops tokens stay valid. Nest will enforce these ceilings
        server-side.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          Idle timeout (minutes)
          <input
            type="number"
            min={5}
            className={fieldClass}
            value={session.idleTimeoutMinutes}
            onChange={(e) =>
              patch({
                idleTimeoutMinutes: Math.max(5, Number(e.target.value) || 5),
              })
            }
          />
        </label>
        <label className={labelClass}>
          Absolute session (hours)
          <input
            type="number"
            min={1}
            className={fieldClass}
            value={session.absoluteSessionHours}
            onChange={(e) =>
              patch({
                absoluteSessionHours: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </label>
        <label className={labelClass}>
          Remember device (days)
          <input
            type="number"
            min={0}
            className={fieldClass}
            value={session.rememberDeviceDays}
            onChange={(e) =>
              patch({
                rememberDeviceDays: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <SettingsToggle
          checked={session.logoutOnBrowserClose}
          onChange={(v) => patch({ logoutOnBrowserClose: v })}
          title="Logout on browser close"
          body="Drop the session cookie when the tab session ends."
        />
        <SettingsToggle
          checked={session.singleSessionOnly}
          onChange={(v) => patch({ singleSessionOnly: v })}
          title="Single active session"
          body="New login revokes older tokens for the same staff account."
        />
      </div>
    </section>
  );
}
