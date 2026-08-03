"use client";

import { useEffect, useState } from "react";
import {
  STAFF_MODULE_META,
  defaultModulesForRole,
  isValidStaffEmail,
  type StaffModuleId,
  type StaffRole,
} from "./staff-data";

export type StaffInvitePayload = {
  name: string;
  email: string;
  role: StaffRole;
  modules: StaffModuleId[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: StaffInvitePayload) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-zinc-500 focus:ring-4 focus:ring-zinc-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

const INVITE_ROLES: StaffRole[] = ["ADMIN", "SUB_ADMIN", "VIEWER"];

export function StaffInviteModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("SUB_ADMIN");
  const [modules, setModules] = useState<StaffModuleId[]>(() =>
    defaultModulesForRole("SUB_ADMIN"),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setRole("SUB_ADMIN");
    setModules(defaultModulesForRole("SUB_ADMIN"));
    setError(null);
  }, [open]);

  if (!open) return null;

  function onRoleChange(next: StaffRole) {
    setRole(next);
    setModules(defaultModulesForRole(next));
  }

  function toggleModule(id: StaffModuleId) {
    setModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  function submit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!isValidStaffEmail(email)) {
      setError("Enter a valid email.");
      return;
    }
    if (modules.length === 0) {
      setError("Assign at least one module.");
      return;
    }
    onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      modules,
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">
              Super Admin
            </p>
            <h2 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-slate-900">
              Invite staff
            </h2>
            <p className="mt-1 text-[12px] text-slate-500">
              Creates an INVITED seat. Super Admin create only — Nest will
              enforce this server-side.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className={labelClass}>
            Full name
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Ops"
            />
          </label>
          <label className={labelClass}>
            Work email
            <input
              type="email"
              className={fieldClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="priya@sensitivitysettings.com"
            />
          </label>
          <label className={labelClass}>
            Role
            <select
              className={fieldClass}
              value={role}
              onChange={(e) => onRoleChange(e.target.value as StaffRole)}
            >
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === "ADMIN"
                    ? "Admin"
                    : r === "SUB_ADMIN"
                      ? "Sub-Admin"
                      : "Viewer"}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className={`${labelClass} mb-2`}>Modules</p>
            <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-slate-100 p-2">
              {STAFF_MODULE_META.map((m) => {
                const on = modules.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleModule(m.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-zinc-800"
                    />
                    {m.label}
                  </label>
                );
              })}
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-900"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-10 rounded-xl bg-slate-900 px-3.5 text-[13px] font-semibold text-white hover:bg-slate-800"
          >
            Send invite
          </button>
        </div>
      </div>
    </div>
  );
}
