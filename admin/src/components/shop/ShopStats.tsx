type Props = {
  live: number;
  disabled: number;
  oneTime: number;
  limited: number;
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
  amber: {
    card: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white",
    label: "text-amber-800/80",
    value: "text-amber-950",
    hint: "text-amber-800/60",
    bar: "bg-amber-500",
  },
  violet: {
    card: "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white",
    label: "text-violet-700/80",
    value: "text-violet-950",
    hint: "text-violet-700/60",
    bar: "bg-violet-500",
  },
};

export function ShopStats({ live, disabled, oneTime, limited }: Props) {
  const stats = [
    { label: "Live items", value: String(live), hint: "Shown in app", tone: "emerald" as const },
    { label: "Disabled", value: String(disabled), hint: "Hidden", tone: "slate" as const },
    { label: "One-time", value: String(oneTime), hint: "Buy once", tone: "amber" as const },
    { label: "Stock capped", value: String(limited), hint: "Has limit", tone: "violet" as const },
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
            <p className={`pl-2 text-[11px] font-semibold tracking-[0.08em] uppercase ${t.label}`}>
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
