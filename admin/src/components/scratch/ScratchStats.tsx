type Props = {
  live: number;
  gifts: number;
  milestones: number;
  oddsSum: number;
};

const TONE = {
  emerald: {
    card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white",
    label: "text-emerald-700/80",
    value: "text-emerald-900",
    hint: "text-emerald-700/60",
    bar: "bg-emerald-500",
  },
  fuchsia: {
    card: "border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-50 to-white",
    label: "text-fuchsia-700/80",
    value: "text-fuchsia-950",
    hint: "text-fuchsia-700/60",
    bar: "bg-fuchsia-500",
  },
  violet: {
    card: "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white",
    label: "text-violet-700/80",
    value: "text-violet-950",
    hint: "text-violet-700/60",
    bar: "bg-violet-500",
  },
  amber: {
    card: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white",
    label: "text-amber-800/80",
    value: "text-amber-950",
    hint: "text-amber-800/60",
    bar: "bg-amber-500",
  },
};

export function ScratchStats({ live, gifts, milestones, oddsSum }: Props) {
  const oddsHint =
    oddsSum > 100
      ? "Over 100% — rebalance"
      : oddsSum < 100
        ? "Under 100% ok"
        : "Balanced";

  const stats = [
    { label: "Live prizes", value: String(live), hint: "Enabled rows", tone: "emerald" as const },
    { label: "Gift pool", value: String(gifts), hint: "Live GIFT", tone: "fuchsia" as const },
    { label: "Milestones", value: String(milestones), hint: "Streak cards", tone: "violet" as const },
    {
      label: "Gift odds Σ",
      value: `${oddsSum}%`,
      hint: oddsHint,
      tone: "amber" as const,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const t = TONE[s.tone];
        return (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-2xl border px-4 py-3.5 ${t.card}`}
          >
            <span aria-hidden className={`absolute top-0 left-0 h-full w-1 ${t.bar}`} />
            <p
              className={`pl-2 text-[11px] font-semibold tracking-[0.08em] uppercase ${t.label}`}
            >
              {s.label}
            </p>
            <p
              className={`mt-1.5 pl-2 text-[24px] font-semibold tracking-[-0.03em] tabular-nums ${t.value}`}
            >
              {s.value}
            </p>
            <p className={`mt-0.5 pl-2 text-[12px] ${t.hint}`}>{s.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
