type Props = {
  total: number;
  active: number;
  restricted: number;
  suspended: number;
  deleted: number;
  coinsHeld: number;
};

const TONE = {
  cyan: {
    card: "border-cyan-200/80 bg-gradient-to-br from-cyan-50 to-white",
    label: "text-cyan-800/80",
    value: "text-cyan-950",
    hint: "text-cyan-700/60",
    bar: "bg-cyan-500",
  },
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
    hint: "text-amber-700/60",
    bar: "bg-amber-500",
  },
  rose: {
    card: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white",
    label: "text-rose-700/80",
    value: "text-rose-950",
    hint: "text-rose-700/60",
    bar: "bg-rose-500",
  },
  slate: {
    card: "border-slate-200/80 bg-gradient-to-br from-slate-50 to-white",
    label: "text-slate-600/90",
    value: "text-slate-900",
    hint: "text-slate-500",
    bar: "bg-slate-500",
  },
};

export function UsersStats({
  total,
  active,
  restricted,
  suspended,
  deleted,
  coinsHeld,
}: Props) {
  const stats = [
    {
      label: "Accounts",
      value: String(total),
      hint: "Google seats",
      tone: "cyan" as const,
    },
    {
      label: "Active",
      value: String(active),
      hint: "In good standing",
      tone: "emerald" as const,
    },
    {
      label: "Restricted",
      value: String(restricted),
      hint: "Soft gate",
      tone: "amber" as const,
    },
    {
      label: "Suspended",
      value: String(suspended),
      hint: "Hard gate",
      tone: "rose" as const,
    },
    {
      label: "Deleted",
      value: String(deleted),
      hint: "Gmail banned",
      tone: "slate" as const,
    },
    {
      label: "Coins held",
      value: coinsHeld.toLocaleString(),
      hint: "Across seats",
      tone: "slate" as const,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
              className={`mt-1.5 pl-2 text-[22px] font-semibold tracking-[-0.03em] tabular-nums ${t.value}`}
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
