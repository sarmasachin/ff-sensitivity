type Props = {
  copied: number;
  blocked: number;
  flagged: number;
  devices: number;
};

const TONE = {
  emerald: {
    card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white",
    label: "text-emerald-700/80",
    value: "text-emerald-900",
    hint: "text-emerald-700/60",
    bar: "bg-emerald-500",
  },
  slate: {
    card: "border-slate-200/80 bg-gradient-to-br from-slate-50 to-white",
    label: "text-slate-600/90",
    value: "text-slate-900",
    hint: "text-slate-500",
    bar: "bg-slate-400",
  },
  rose: {
    card: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white",
    label: "text-rose-700/80",
    value: "text-rose-950",
    hint: "text-rose-700/60",
    bar: "bg-rose-500",
  },
  sky: {
    card: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white",
    label: "text-sky-700/80",
    value: "text-sky-950",
    hint: "text-sky-700/60",
    bar: "bg-sky-500",
  },
};

export function ClaimsStats({ copied, blocked, flagged, devices }: Props) {
  const stats = [
    {
      label: "Copied",
      value: String(copied),
      hint: "Code + Copy success",
      tone: "emerald" as const,
    },
    {
      label: "Blocked",
      value: String(blocked),
      hint: "Already / copy fail",
      tone: "slate" as const,
    },
    {
      label: "Abuse watch",
      value: String(flagged),
      hint: "Flagged or high score",
      tone: "rose" as const,
    },
    {
      label: "Devices",
      value: String(devices),
      hint: "Unique device ids",
      tone: "sky" as const,
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
