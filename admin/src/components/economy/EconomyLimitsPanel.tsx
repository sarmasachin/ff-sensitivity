import type { EconomyFormValues } from "./economy-data";

type Props = {
  values: EconomyFormValues;
  onChange: (next: EconomyFormValues) => void;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] font-semibold tabular-nums text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10";

const labelClass = "block text-[11px] font-semibold text-slate-600";

export function EconomyLimitsPanel({ values, onChange }: Props) {
  function patch(partial: Partial<EconomyFormValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-4">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
          Caps
        </p>
        <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
          Wallet & daily limits
        </h2>
        <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
          Hard ceiling stops runaway balances. Daily earn cap is optional — leave
          blank for unlimited (Android default).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Wallet cap
          <input
            type="number"
            min={100}
            className={fieldClass}
            value={values.walletCap}
            onChange={(e) => patch({ walletCap: e.target.value })}
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            Android default: 9,999,999
          </span>
        </label>
        <label className={labelClass}>
          Daily earn cap
          <input
            type="number"
            min={0}
            className={fieldClass}
            value={values.dailyEarnCap}
            onChange={(e) => patch({ dailyEarnCap: e.target.value })}
            placeholder="Blank = unlimited"
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            Soft stop after this many coins earned in a day
          </span>
        </label>
      </div>
    </section>
  );
}
