import type { DailyChallengeAdsState } from "./daily-challenge-ads-data";

type Props = {
  value: DailyChallengeAdsState;
  onChange: (next: DailyChallengeAdsState) => void;
  readOnly?: boolean;
};

const labelClass = "block text-[11px] font-semibold tracking-wide text-slate-600";
const fieldClass =
  "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium tabular-nums text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:bg-slate-50 disabled:text-slate-400";

export function DailyChallengeAdsForm({ value, onChange, readOnly }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Daily Challenge
          </p>
          <h2 className="text-[15px] font-bold tracking-[-0.02em] text-slate-900">
            Quiz timing
          </h2>
        </div>
        <p className="text-[11px] text-slate-400">
          Watch Ad Bonus placement is above. Lock is challenge timing only.
        </p>
      </div>

      <div className="max-w-md rounded-xl border border-slate-200/90 bg-slate-50/40 p-4">
        <h3 className="text-[14px] font-bold text-slate-900">
          Quiz second chance lock
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Wrong answer wait time before the second-chance ad.
        </p>
        <label className={`${labelClass} mt-3`}>
          Lock after wrong (minutes)
          <input
            type="number"
            min={1}
            max={1440}
            disabled={readOnly}
            className={fieldClass}
            value={value.wrongAnswerLockMinutes}
            onChange={(e) =>
              onChange({
                wrongAnswerLockMinutes: Math.max(
                  1,
                  Math.min(1440, Number(e.target.value) || 1),
                ),
              })
            }
          />
          <span className="mt-1 block text-[10px] font-normal text-slate-400">
            Default 20
          </span>
        </label>
      </div>
    </section>
  );
}
