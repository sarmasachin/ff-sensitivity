"use client";

import type { ProfileAccount } from "./profile-data";
import { ProfileToggle } from "./ProfileToggle";

type Props = {
  account: ProfileAccount;
  onChange: (next: ProfileAccount) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function ProfileAccountCard({ account, onChange }: Props) {
  function patch(partial: Partial<ProfileAccount>) {
    onChange({ ...account, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-indigo-800 uppercase">
        Account
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Contact & digests
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Where this seat should receive security alerts. Not Android push —
        console operator mail only.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Notify email
          <input
            type="email"
            className={fieldClass}
            value={account.notifyEmail}
            onChange={(e) => patch({ notifyEmail: e.target.value })}
            placeholder="ops@example.com"
            autoComplete="email"
          />
        </label>
        <label className={labelClass}>
          Phone (optional)
          <input
            type="tel"
            className={fieldClass}
            value={account.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            placeholder="+91 …"
            autoComplete="tel"
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Timezone
          <input
            className={fieldClass}
            value={account.timezoneLabel}
            onChange={(e) => patch({ timezoneLabel: e.target.value })}
            placeholder="Asia/Kolkata (IST)"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <ProfileToggle
          checked={account.digestSecurity}
          onChange={(v) => patch({ digestSecurity: v })}
          title="Security digests"
          body="Failed login spikes, forced resets, and staff invite alerts."
        />
        <ProfileToggle
          checked={account.digestDaily}
          onChange={(v) => patch({ digestDaily: v })}
          title="Daily ops summary"
          body="Morning rollup of claims, support, and redeem volume."
        />
      </div>
    </section>
  );
}
