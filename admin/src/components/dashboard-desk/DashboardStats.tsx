import { formatCompact, type DashKpis } from "./dashboard-data";

type Props = {
  kpis: DashKpis;
  rangeLabel: string;
};

const TONE = {
  sky: {
    card: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white",
    label: "text-sky-800/80",
    value: "text-sky-950",
    hint: "text-sky-700/60",
    bar: "bg-sky-500",
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
  indigo: {
    card: "border-indigo-200/80 bg-gradient-to-br from-indigo-50 to-white",
    label: "text-indigo-700/80",
    value: "text-indigo-950",
    hint: "text-indigo-700/60",
    bar: "bg-indigo-500",
  },
  teal: {
    card: "border-teal-200/80 bg-gradient-to-br from-teal-50 to-white",
    label: "text-teal-700/80",
    value: "text-teal-950",
    hint: "text-teal-700/60",
    bar: "bg-teal-500",
  },
};

export function DashboardStats({ kpis, rangeLabel }: Props) {
  const stats = [
    {
      label: "Active codes",
      value: formatCompact(kpis.activeCodes),
      hint: "Redeem pool live",
      tone: "emerald" as const,
    },
    {
      label: "Claims",
      value: formatCompact(kpis.claimsToday),
      hint: rangeLabel,
      tone: "sky" as const,
    },
    {
      label: "Low stock",
      value: String(kpis.lowStock),
      hint: "SKU / code alerts",
      tone: "amber" as const,
    },
    {
      label: "Pending support",
      value: String(kpis.pendingSupport),
      hint: "Open tickets",
      tone: "rose" as const,
    },
    {
      label: "Push sends",
      value: formatCompact(kpis.pushSends),
      hint: rangeLabel,
      tone: "indigo" as const,
    },
    {
      label: "Wallet net",
      value: formatCompact(kpis.walletNet),
      hint: "Grant − revoke",
      tone: "teal" as const,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
