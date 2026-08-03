"use client";

import type { ScratchPolicy } from "./scratch-data";

type Props = {
  policy: ScratchPolicy;
  onChange: (next: ScratchPolicy) => void;
};

export function ScratchPolicyCard({ policy, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 via-white to-fuchsia-50/50 p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-600 uppercase">
            History policy
          </p>
          <h2 className="mt-1 text-[15px] font-semibold text-slate-900">
            Scratch archive retention
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Matches Android ScratchHistoryStore (default 30 days).
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block text-[12px] font-semibold text-slate-600">
          Retention (days)
          <input
            type="number"
            min={1}
            max={365}
            value={policy.retentionDays}
            onChange={(e) =>
              onChange({
                ...policy,
                retentionDays: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 text-[13px] text-slate-900 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
          />
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-[13px] font-medium text-slate-700 sm:mt-6">
          <input
            type="checkbox"
            checked={policy.autoPurge}
            onChange={(e) =>
              onChange({ ...policy, autoPurge: e.target.checked })
            }
            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
          />
          Auto-purge expired
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-[13px] font-medium text-slate-700 sm:mt-6">
          <input
            type="checkbox"
            checked={policy.showExpired}
            onChange={(e) =>
              onChange({ ...policy, showExpired: e.target.checked })
            }
            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
          />
          Show expired in archive
        </label>
      </div>
    </section>
  );
}
