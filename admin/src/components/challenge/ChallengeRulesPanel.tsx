import type { ChallengeRules } from "./challenge-data";

type Props = {
  rules: ChallengeRules;
  onChange: (next: ChallengeRules) => void;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] font-semibold tabular-nums text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10";

function ToggleRow({
  checked,
  onChange,
  title,
  body,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  body: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-white/80 px-3.5 py-3 hover:border-orange-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
      />
      <span>
        <span className="block text-[13px] font-semibold text-slate-900">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] text-slate-500">{body}</span>
      </span>
    </label>
  );
}

export function ChallengeRulesPanel({ rules, onChange }: Props) {
  function patch(partial: Partial<ChallengeRules>) {
    onChange({ ...rules, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-4">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-orange-700 uppercase">
          Today flow
        </p>
        <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
          Daily challenge rules
        </h2>
        <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
          Controls Android Daily Challenge Today tab. Coin amounts live under
          Economy; scratch prize odds under Scratch.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <ToggleRow
          checked={rules.requireCheckIn}
          onChange={(v) => patch({ requireCheckIn: v })}
          title="Require check-in"
          body="First daily task — grows streak when done."
        />
        <ToggleRow
          checked={rules.requireQuiz}
          onChange={(v) => patch({ requireQuiz: v })}
          title="Require quiz"
          body="One question / day from the quiz bank (max 1500)."
        />
        <ToggleRow
          checked={rules.adBonusOptional}
          onChange={(v) => patch({ adBonusOptional: v })}
          title="Optional ad bonus"
          body="Watch Ad for Bonus Coins — cooldown hours below (not once/day)."
        />
        <ToggleRow
          checked={rules.missDayResetsStreak}
          onChange={(v) => patch({ missDayResetsStreak: v })}
          title="Miss day resets streak"
          body="Skip a calendar day → streak back to 1 on next check-in."
        />
        <ToggleRow
          checked={rules.cardExpiresSameDay}
          onChange={(v) => patch({ cardExpiresSameDay: v })}
          title="Scratch expires same day"
          body="Missed scratch card is gone at midnight."
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-[11px] font-semibold text-slate-600">
          Ad bonus cooldown (hours)
          <input
            type="number"
            min={1}
            max={168}
            className={fieldClass}
            value={rules.adBonusCooldownHours}
            onChange={(e) =>
              patch({
                adBonusCooldownHours: Math.max(
                  1,
                  Math.min(168, Number(e.target.value) || 1),
                ),
              })
            }
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            After claim: “Next Ad Available in …” (default 4)
          </span>
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">
          Scratch cards / day
          <input
            type="number"
            min={0}
            max={5}
            className={fieldClass}
            value={rules.scratchCardsPerDay}
            onChange={(e) =>
              patch({
                scratchCardsPerDay: Math.max(
                  0,
                  Math.min(5, Number(e.target.value) || 0),
                ),
              })
            }
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            After challenge complete (default 1)
          </span>
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">
          First milestone (days)
          <input
            type="number"
            min={1}
            className={fieldClass}
            value={rules.firstMilestoneDays}
            onChange={(e) =>
              patch({
                firstMilestoneDays: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            Highlight / default first gate (Android: 7)
          </span>
        </label>
      </div>
    </section>
  );
}
