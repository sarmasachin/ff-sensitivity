type Props = {
  maxDaily: number;
  liveSources: number;
  walletCap: number;
  dirty: boolean;
};

const TONE = {
  emerald: {
    card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white",
    label: "text-emerald-700/80",
    value: "text-emerald-900",
    hint: "text-emerald-700/60",
    bar: "bg-emerald-500",
  },
  teal: {
    card: "border-teal-200/80 bg-gradient-to-br from-teal-50 to-white",
    label: "text-teal-700/80",
    value: "text-teal-950",
    hint: "text-teal-700/60",
    bar: "bg-teal-500",
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
};

function formatCap(n: number) {
  return n.toLocaleString("en-US");
}

export function EconomyStats({
  maxDaily,
  liveSources,
  walletCap,
  dirty,
}: Props) {
  const stats = [
    {
      label: "Max daily earn",
      value: `+${maxDaily}`,
      hint: "If all sources done",
      tone: "emerald" as const,
    },
    {
      label: "Live sources",
      value: `${liveSources}/3`,
      hint: "Paying coins today",
      tone: "teal" as const,
    },
    {
      label: "Wallet cap",
      value: formatCap(walletCap),
      hint: "Hard ceiling",
      tone: "slate" as const,
    },
    {
      label: "Draft",
      value: dirty ? "Unsaved" : "Synced",
      hint: dirty ? "Save to keep" : "Matches last save",
      tone: dirty ? ("amber" as const) : ("emerald" as const),
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
