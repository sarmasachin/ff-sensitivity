type Props = {
  idleMinutes: number;
  sessionHours: number;
  reauthGates: number;
  singleSession: boolean;
  landing: string;
};

const TONE = {
  stone: {
    card: "border-stone-200/80 bg-gradient-to-br from-stone-50 to-white",
    label: "text-stone-600/90",
    value: "text-stone-900",
    hint: "text-stone-500",
    bar: "bg-stone-500",
  },
  orange: {
    card: "border-orange-200/80 bg-gradient-to-br from-orange-50 to-white",
    label: "text-orange-800/80",
    value: "text-orange-950",
    hint: "text-orange-700/60",
    bar: "bg-orange-500",
  },
  rose: {
    card: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white",
    label: "text-rose-700/80",
    value: "text-rose-950",
    hint: "text-rose-700/60",
    bar: "bg-rose-500",
  },
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
};

export function SettingsStats({
  idleMinutes,
  sessionHours,
  reauthGates,
  singleSession,
  landing,
}: Props) {
  const stats = [
    {
      label: "Idle timeout",
      value: `${idleMinutes}m`,
      hint: "Before lock screen",
      tone: "stone" as const,
    },
    {
      label: "Max session",
      value: `${sessionHours}h`,
      hint: "Absolute ceiling",
      tone: "orange" as const,
    },
    {
      label: "Reauth gates",
      value: `${reauthGates}/3`,
      hint: "Reveal · invite · wallet",
      tone: "rose" as const,
    },
    {
      label: "Single session",
      value: singleSession ? "On" : "Off",
      tone: "emerald" as const,
      hint: singleSession ? "One active token" : "Multi-device OK",
    },
    {
      label: "Landing",
      value: landing.replace(/^\//, "") || "—",
      hint: "Post-login route",
      tone: "slate" as const,
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
