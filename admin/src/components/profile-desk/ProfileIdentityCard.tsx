"use client";

import type { ProfileIdentity, ProfileSessionInfo } from "./profile-data";
import { roleLabel } from "./profile-data";

type Props = {
  identity: ProfileIdentity;
  session: ProfileSessionInfo;
  onChange: (next: ProfileIdentity) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function ProfileIdentityCard({ identity, session, onChange }: Props) {
  function patch(partial: Partial<ProfileIdentity>) {
    onChange({ ...identity, ...partial });
  }

  const initial = (identity.displayName || session.email || "O")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-indigo-800 uppercase">
        Identity
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        How you appear in ops
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Login email is fixed from auth. Display name is for desk UI and future
        audit lines.
      </p>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3.5">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-[20px] font-semibold text-white"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-slate-900">
              {identity.displayName.trim() || "—"}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-slate-500">
              {session.email || "No email in session"}
            </p>
            <p className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-indigo-700 uppercase">
              {roleLabel(session.role)}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>
            Display name
            <input
              className={fieldClass}
              value={identity.displayName}
              onChange={(e) => patch({ displayName: e.target.value })}
              placeholder="e.g. Sachin Sharma"
              autoComplete="name"
            />
          </label>
          <label className={labelClass}>
            Job title
            <input
              className={fieldClass}
              value={identity.jobTitle}
              onChange={(e) => patch({ jobTitle: e.target.value })}
              placeholder="Ops lead"
            />
          </label>
          <label className={labelClass}>
            Desk label
            <input
              className={fieldClass}
              value={identity.deskLabel}
              onChange={(e) => patch({ deskLabel: e.target.value })}
              placeholder="FF Sensitivity Ops"
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Sign-in email
            <input
              className={`${fieldClass} bg-slate-50 text-slate-600`}
              value={session.email}
              readOnly
              aria-readonly
            />
          </label>
        </div>
      </div>
    </section>
  );
}
