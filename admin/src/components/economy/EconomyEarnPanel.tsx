import type { EconomyFormValues } from "./economy-data";

type Props = {
  values: EconomyFormValues;
  onChange: (next: EconomyFormValues) => void;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] font-semibold tabular-nums text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10";

type SourceCard = {
  key: "checkIn" | "quizCorrect" | "quizWrong" | "adBonus";
  enabledKey?: "checkInEnabled" | "quizEnabled" | "adBonusEnabled";
  valueKey: keyof Pick<
    EconomyFormValues,
    "checkInCoins" | "quizCorrectCoins" | "quizWrongCoins" | "adBonusCoins"
  >;
  title: string;
  subtitle: string;
  accent: string;
  bar: string;
};

const SOURCES: SourceCard[] = [
  {
    key: "checkIn",
    enabledKey: "checkInEnabled",
    valueKey: "checkInCoins",
    title: "Daily check-in",
    subtitle: "Base coins on first check-in each day",
    accent: "from-emerald-50 to-white border-emerald-200/80",
    bar: "bg-emerald-500",
  },
  {
    key: "quizCorrect",
    enabledKey: "quizEnabled",
    valueKey: "quizCorrectCoins",
    title: "Quiz · correct",
    subtitle: "Reward when daily quiz answer is right",
    accent: "from-teal-50 to-white border-teal-200/80",
    bar: "bg-teal-500",
  },
  {
    key: "quizWrong",
    valueKey: "quizWrongCoins",
    title: "Quiz · wrong",
    subtitle: "Consolation coins (same quiz toggle)",
    accent: "from-slate-50 to-white border-slate-200/80",
    bar: "bg-slate-400",
  },
  {
    key: "adBonus",
    enabledKey: "adBonusEnabled",
    valueKey: "adBonusCoins",
    title: "Ad bonus",
    subtitle: "Optional rewarded — cooldown hours set in Challenge rules",
    accent: "from-cyan-50 to-white border-cyan-200/80",
    bar: "bg-cyan-500",
  },
];

export function EconomyEarnPanel({ values, onChange }: Props) {
  function patch(partial: Partial<EconomyFormValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-4">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-emerald-700 uppercase">
          Daily earn
        </p>
        <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
          Coin sources
        </h2>
        <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
          Amounts match Android Daily Challenge defaults. Toggle a source off to
          hide it in-app without an APK update (after API wire-up).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SOURCES.map((s) => {
          const enabled = s.enabledKey ? values[s.enabledKey] : values.quizEnabled;
          return (
            <article
              key={s.key}
              className={`relative overflow-hidden rounded-xl border bg-gradient-to-br px-4 py-3.5 ${s.accent} ${
                enabled ? "" : "opacity-60"
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-0 left-0 h-full w-1 ${s.bar}`}
              />
              <div className="flex items-start justify-between gap-3 pl-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900">
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {s.subtitle}
                  </p>
                </div>
                {s.enabledKey ? (
                  <label className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={values[s.enabledKey]}
                      onChange={(e) =>
                        patch({ [s.enabledKey!]: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    On
                  </label>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                    Via quiz
                  </span>
                )}
              </div>
              <label className="mt-3 block pl-2 text-[11px] font-semibold text-slate-600">
                Coins
                <input
                  type="number"
                  min={0}
                  className={fieldClass}
                  value={values[s.valueKey]}
                  onChange={(e) => patch({ [s.valueKey]: e.target.value })}
                />
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );
}
