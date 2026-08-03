type Props = {
  active: number;
  low: number;
  paused: number;
  expiring: number;
};

const TONE = {
  emerald: {
    card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white",
    label: "text-emerald-700/80",
    value: "text-emerald-900",
    hint: "text-emerald-700/60",
    bar: "bg-emerald-500",
  },
  amber: {
    card: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white",
    label: "text-amber-800/80",
    value: "text-amber-950",
    hint: "text-amber-800/60",
    bar: "bg-amber-500",
  },
  sky: {
    card: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white",
    label: "text-sky-700/80",
    value: "text-sky-950",
    hint: "text-sky-700/60",
    bar: "bg-sky-500",
  },
  rose: {
    card: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white",
    label: "text-rose-700/80",
    value: "text-rose-950",
    hint: "text-rose-700/60",
    bar: "bg-rose-500",
  },
};

export function RedeemStats({ active, low, paused, expiring }: Props) {
  const stats = [
    { label: "Active codes", value: String(active), hint: "In stock", tone: "emerald" as const },
    { label: "Low stock", value: String(low), hint: "≤ 2 left", tone: "amber" as const },
    { label: "Paused", value: String(paused), hint: "Hidden from app", tone: "sky" as const },
    { label: "Expiring soon", value: String(expiring), hint: "Label match", tone: "rose" as const },
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
            <p className={`mt-1.5 pl-2 text-[24px] font-semibold tracking-[-0.03em] tabular-nums ${t.value}`}>
              {s.value}
            </p>
            <p className={`mt-0.5 pl-2 text-[12px] ${t.hint}`}>{s.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
