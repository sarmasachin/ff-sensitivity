import type { ChallengeRules } from "./challenge-data";

type Props = {
  rules: ChallengeRules;
  onChange: (next: ChallengeRules) => void;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] font-semibold tabular-nums text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10";

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function signedLabel(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function ChallengeQuizCoinsCard({ rules, onChange }: Props) {
  function patch(partial: Partial<ChallengeRules>) {
    onChange({ ...rules, ...partial });
  }

  const wrongIsPenalty = rules.quizWrongCoins < 0;

  return (
    <section className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/90 via-white to-orange-50/40 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-rose-700 uppercase">
        Quiz rewards
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Correct / wrong coin control
      </h2>
      <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-slate-600">
        Yahan se quiz ke coin amounts set karo. Wrong pe negative value (jaise{" "}
        <span className="font-semibold text-rose-700">-10</span>) lagao to user
        ke coins kam honge — balance{" "}
        <span className="font-semibold text-slate-800">0 se neeche</span> bhi ja
        sakta hai (example: 0 coins + wrong −10 →{" "}
        <span className="font-semibold text-rose-700">−10</span>).
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3">
          <p className="text-[12px] font-semibold text-emerald-900">
            Correct → {signedLabel(rules.quizCorrectCoins)} coins
          </p>
          <p className="mt-0.5 text-[12px] text-emerald-800/80">
            Sahi answer pe add hota hai (0 ya positive).
          </p>
        </div>
        <div
          className={
            wrongIsPenalty
              ? "rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-3"
              : "rounded-xl border border-amber-100 bg-amber-50/70 px-3.5 py-3"
          }
        >
          <p
            className={
              wrongIsPenalty
                ? "text-[12px] font-semibold text-rose-900"
                : "text-[12px] font-semibold text-amber-950"
            }
          >
            Wrong → {signedLabel(rules.quizWrongCoins)} coins
            {wrongIsPenalty ? " · penalty" : ""}
          </p>
          <p
            className={
              wrongIsPenalty
                ? "mt-0.5 text-[12px] text-rose-800/80"
                : "mt-0.5 text-[12px] text-amber-900/80"
            }
          >
            {wrongIsPenalty
              ? "Negative = deduct. Floor nahi — balance negative ho sakta hai."
              : "Positive = galat pe bhi reward. 0 = no coin change."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-[11px] font-semibold text-slate-600">
          Correct answer coins
          <input
            type="number"
            min={0}
            max={9999}
            className={fieldClass}
            value={rules.quizCorrectCoins}
            onChange={(e) =>
              patch({
                quizCorrectCoins: clampInt(e.target.value, 0, 9999, 50),
              })
            }
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            Default 50 · min 0 · max 9999
          </span>
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">
          Wrong answer coins (negative allowed)
          <input
            type="number"
            min={-9999}
            max={9999}
            className={fieldClass}
            value={rules.quizWrongCoins}
            onChange={(e) =>
              patch({
                quizWrongCoins: clampInt(e.target.value, -9999, 9999, -10),
              })
            }
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            Default −10 · e.g. −10 penalty, +10 reward, 0 none
          </span>
        </label>
      </div>
    </section>
  );
}
