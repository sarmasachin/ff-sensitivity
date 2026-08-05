"use client";

import type { ProfileSecurityForm } from "./profile-data";

type Props = {
  security: ProfileSecurityForm;
  mustChangePassword: boolean;
  onChange: (next: ProfileSecurityForm) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function ProfileSecurityCard({
  security,
  mustChangePassword,
  onChange,
}: Props) {
  function patch(partial: Partial<ProfileSecurityForm>) {
    onChange({ ...security, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-indigo-800 uppercase">
        Security
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Change password
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Leave blank to keep the current password. Nest will verify the current
        credential before accepting a rotation.
      </p>

      {mustChangePassword ? (
        <div
          role="status"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] font-medium text-amber-950"
        >
          This seat is flagged for a password change before continuing sensitive
          actions.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          Current password
          <input
            type="password"
            className={fieldClass}
            value={security.currentPassword}
            onChange={(e) => patch({ currentPassword: e.target.value })}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>
        <label className={labelClass}>
          New password
          <input
            type="password"
            className={fieldClass}
            value={security.newPassword}
            onChange={(e) => patch({ newPassword: e.target.value })}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
          />
        </label>
        <label className={labelClass}>
          Confirm new password
          <input
            type="password"
            className={fieldClass}
            value={security.confirmPassword}
            onChange={(e) => patch({ confirmPassword: e.target.value })}
            autoComplete="new-password"
            placeholder="Repeat new password"
          />
        </label>
      </div>

      <ul className="mt-4 space-y-1.5 text-[12px] text-slate-500">
        <li className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          Prefer a unique password — not shared with personal Google or email.
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          Rotation is audited. Staff invites and wallet adjusts may still ask
          for step-up reauth (Settings).
        </li>
      </ul>
    </section>
  );
}
