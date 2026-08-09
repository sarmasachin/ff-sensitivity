import type { ChallengeRules } from "./challenge-data";

type Props = {
  rules: ChallengeRules;
  onChange: (next: ChallengeRules) => void;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] font-semibold tabular-nums text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10";

export function ChallengeQuizTimingCard({ rules, onChange }: Props) {
  function patch(partial: Partial<ChallengeRules>) {
    onChange({ ...rules, ...partial });
  }

  return (
    <section className="rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50/90 via-white to-rose-50/50 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-orange-700 uppercase">
        Quiz second chance
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Wrong answer · lock then rewarded ad
      </h2>
      <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-slate-600">
        Galat answer ke baad lock countdown. Time ke baad user rewarded ad
        dekhega — phir naya question unlock hoga (same question dubara nahi).
      </p>

      <ol className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { step: "1", title: "Wrong", body: "User submits wrong answer" },
          {
            step: "2",
            title: "Lock countdown",
            body: `${rules.wrongAnswerLockMinutes} min — button pe timer`,
          },
          {
            step: "3",
            title: "Watch Ad → new Q",
            body: "Rewarded ad unlocks a different question",
          },
        ].map((item) => (
          <li
            key={item.step}
            className="flex items-start gap-3 rounded-xl border border-orange-100 bg-white/80 px-3.5 py-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-[12px] font-bold text-white">
              {item.step}
            </span>
            <div>
              <p className="text-[13px] font-semibold text-slate-900">
                {item.title}
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-[11px] font-semibold text-slate-600">
          Lock after wrong (minutes)
          <input
            type="number"
            min={1}
            max={1440}
            className={fieldClass}
            value={rules.wrongAnswerLockMinutes}
            onChange={(e) =>
              patch({
                wrongAnswerLockMinutes: Math.max(
                  1,
                  Math.min(1440, Number(e.target.value) || 1),
                ),
              })
            }
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            Default 20 — then Watch Ad for a new question
          </span>
        </label>
      </div>
    </section>
  );
}
