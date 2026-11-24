import type { EconomyFormValues } from "./economy-data";

type Props = {
  values: EconomyFormValues;
  onChange: (next: EconomyFormValues) => void;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] font-semibold tabular-nums text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10";

const labelClass = "block text-[11px] font-semibold text-slate-600";

export function EconomyPremiumUnlockPanel({ values, onChange }: Props) {
  function patch(partial: Partial<EconomyFormValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-4">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
          Premium Sensi
        </p>
        <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
          Unlock coin prices
        </h2>
        <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
          Coins deducted from the server wallet when a user unlocks with coins.
          Set <span className="font-semibold text-slate-700">0</span> for free
          coin-unlock. Use the checkboxes below to show coins, watch ad, or both
          in the app dialog.
        </p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/60 px-3 py-2.5">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            checked={values.premiumUnlockCoinEnabled}
            onChange={(e) =>
              patch({ premiumUnlockCoinEnabled: e.target.checked })
            }
          />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-slate-900">
              Unlock with coins
            </span>
            <span className="block text-[11px] text-slate-500">
              Show coin button in Premium unlock dialog
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/60 px-3 py-2.5">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            checked={values.premiumUnlockAdEnabled}
            onChange={(e) =>
              patch({ premiumUnlockAdEnabled: e.target.checked })
            }
          />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-slate-900">
              Watch ad to unlock
            </span>
            <span className="block text-[11px] text-slate-500">
              Show rewarded-ad button in Premium unlock dialog
            </span>
          </span>
        </label>
      </div>
      {!values.premiumUnlockCoinEnabled && !values.premiumUnlockAdEnabled ? (
        <p className="mb-4 text-[12px] font-semibold text-rose-600">
          Enable at least one path (coins or watch ad).
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          Best Premium
          <input
            type="number"
            min={0}
            max={100000}
            disabled={!values.premiumUnlockCoinEnabled}
            className={fieldClass}
            value={values.premiumUnlockBest}
            onChange={(e) => patch({ premiumUnlockBest: e.target.value })}
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            Default 100
          </span>
        </label>
        <label className={labelClass}>
          Premium Pro Max
          <input
            type="number"
            min={0}
            max={100000}
            disabled={!values.premiumUnlockCoinEnabled}
            className={fieldClass}
            value={values.premiumUnlockProMax}
            onChange={(e) => patch({ premiumUnlockProMax: e.target.value })}
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            Default 200
          </span>
        </label>
        <label className={labelClass}>
          One Tap Premium
          <input
            type="number"
            min={0}
            max={100000}
            disabled={!values.premiumUnlockCoinEnabled}
            className={fieldClass}
            value={values.premiumUnlockOneTap}
            onChange={(e) => patch({ premiumUnlockOneTap: e.target.value })}
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            Default 150
          </span>
        </label>
      </div>
    </section>
  );
}
