type Props = {
  quizLive: number;
  milestonesLive: number;
  firstGate: number;
  tasks: number;
};

const TONE = {
  orange: {
    card: "border-orange-200/80 bg-gradient-to-br from-orange-50 to-white",
    label: "text-orange-800/80",
    value: "text-orange-950",
    hint: "text-orange-800/60",
    bar: "bg-orange-500",
  },
  rose: {
    card: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white",
    label: "text-rose-700/80",
    value: "text-rose-950",
    hint: "text-rose-700/60",
    bar: "bg-rose-500",
  },
  amber: {
    card: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white",
    label: "text-amber-800/80",
    value: "text-amber-950",
    hint: "text-amber-800/60",
    bar: "bg-amber-500",
  },
  fuchsia: {
    card: "border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-50 to-white",
    label: "text-fuchsia-700/80",
    value: "text-fuchsia-950",
    hint: "text-fuchsia-700/60",
    bar: "bg-fuchsia-500",
  },
};

export function ChallengeStats({
  quizLive,
  milestonesLive,
  firstGate,
  tasks,
}: Props) {
  const stats = [
    {
      label: "Quiz live",
      value: String(quizLive),
      hint: "In rotation bank",
      tone: "orange" as const,
    },
    {
      label: "Milestones",
      value: String(milestonesLive),
      hint: "Enabled gates",
      tone: "rose" as const,
    },
    {
      label: "First gate",
      value: `${firstGate}d`,
      hint: "First streak unlock",
      tone: "amber" as const,
    },
    {
      label: "Daily tasks",
      value: `${tasks}/3`,
      hint: "Check-in · quiz · ad",
      tone: "fuchsia" as const,
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
            <span
              aria-hidden
              className={`absolute top-0 left-0 h-full w-1 ${t.bar}`}
            />
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
