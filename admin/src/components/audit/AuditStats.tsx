type Props = {
  total: number;
  today: number;
  logins: number;
  denied: number;
  reveals: number;
};

const TONE = {
  blue: {
    card: "border-blue-200/80 bg-gradient-to-br from-blue-50 to-white",
    label: "text-blue-700/80",
    value: "text-blue-950",
    hint: "text-blue-700/60",
    bar: "bg-blue-500",
  },
  slate: {
    card: "border-slate-200/80 bg-gradient-to-br from-slate-50 to-white",
    label: "text-slate-600/90",
    value: "text-slate-900",
    hint: "text-slate-500",
    bar: "bg-slate-400",
  },
  emerald: {
    card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white",
    label: "text-emerald-700/80",
    value: "text-emerald-900",
    hint: "text-emerald-700/60",
    bar: "bg-emerald-500",
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
    hint: "text-amber-700/60",
    bar: "bg-amber-500",
  },
};

export function AuditStats({
  total,
  today,
  logins,
  denied,
  reveals,
}: Props) {
  const stats = [
    {
      label: "Events",
      value: String(total),
      hint: "Append-only rows",
      tone: "blue" as const,
    },
    {
      label: "Last 24h",
      value: String(today),
      hint: "Recent activity",
      tone: "slate" as const,
    },
    {
      label: "Logins",
      value: String(logins),
      hint: "Session events",
      tone: "emerald" as const,
    },
    {
      label: "Denied / fail",
      value: String(denied),
      hint: "ACL + auth misses",
      tone: "rose" as const,
    },
    {
      label: "Reveals",
      value: String(reveals),
      hint: "Code secret opens",
      tone: "amber" as const,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
