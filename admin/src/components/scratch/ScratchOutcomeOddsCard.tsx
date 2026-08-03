"use client";

import { useEffect, useState } from "react";
import {
  outcomeOddsTotal,
  validateOutcomeOdds,
  type ScratchOutcomeOdds,
} from "./scratch-data";

type Props = {
  odds: ScratchOutcomeOdds;
  onSave: (next: ScratchOutcomeOdds) => void;
};

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 text-[13px] font-semibold tabular-nums text-slate-900 outline-none focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-500/10";

function clampPct(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

export function ScratchOutcomeOddsCard({ odds, onSave }: Props) {
  const [draft, setDraft] = useState(odds);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(odds);
    setError(null);
  }, [odds]);

  const total = Math.round(outcomeOddsTotal(draft) * 10) / 10;
  const balanced = total === 100;

  function patch(partial: Partial<ScratchOutcomeOdds>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setError(null);
  }

  function handleSave() {
    const next: ScratchOutcomeOdds = {
      coinsPercent: draft.coinsPercent,
      redeemPercent: draft.redeemPercent,
      coinAmount: Math.floor(Number(draft.coinAmount) || 0),
    };
    const err = validateOutcomeOdds(next);
    if (err) {
      setError(err);
      return;
    }
    onSave(next);
  }

  return (
    <section className="rounded-2xl border border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-50/90 via-white to-violet-50/60 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-fuchsia-700 uppercase">
            Live control
          </p>
          <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
            Scratch outcome odds
          </h2>
          <p className="mt-0.5 max-w-xl text-[12px] text-slate-500">
            Jab user card scratch kare — coins ya redeem code. Total exactly
            100% hona chahiye. No empty / better-luck outcome.
          </p>
        </div>
        <div
          className={[
            "mt-2 inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[12px] font-semibold tabular-nums ring-1 sm:mt-0",
            balanced
              ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
              : "bg-amber-100 text-amber-900 ring-amber-200",
          ].join(" ")}
        >
          Total {total}%
        </div>
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80">
        <span
          className="bg-amber-500 transition-[width]"
          style={{ width: `${draft.coinsPercent}%` }}
          title="Coins"
        />
        <span
          className="bg-indigo-500 transition-[width]"
          style={{ width: `${draft.redeemPercent}%` }}
          title="Redeem code"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Coins
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" /> Redeem code
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-[12px] font-semibold text-slate-600">
          Coins %
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            className={fieldClass}
            value={draft.coinsPercent}
            onChange={(e) => patch({ coinsPercent: clampPct(e.target.value) })}
          />
        </label>
        <label className="block text-[12px] font-semibold text-slate-600">
          Redeem code %
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            className={fieldClass}
            value={draft.redeemPercent}
            onChange={(e) => patch({ redeemPercent: clampPct(e.target.value) })}
          />
        </label>
        <label className="block text-[12px] font-semibold text-slate-600">
          Coins if win
          <input
            type="number"
            min={0}
            className={fieldClass}
            value={draft.coinAmount}
            onChange={(e) =>
              patch({ coinAmount: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-[12px] font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">
          Saved locally for now — Nest + Android odds sync next.
        </p>
        <button
          type="button"
          onClick={handleSave}
          className="h-10 rounded-xl bg-fuchsia-600 px-4 text-[13px] font-semibold text-white hover:bg-fuchsia-500"
        >
          Save odds
        </button>
      </div>
    </section>
  );
}
