type Props = {
  displayName: string;
  role: string;
  modules: number | string;
  storage: string;
  mustChange: boolean;
};

const TONE = {
  indigo: {
    card: "border-indigo-200/80 bg-gradient-to-br from-indigo-50 to-white",
    label: "text-indigo-800/80",
    value: "text-indigo-950",
    hint: "text-indigo-700/60",
    bar: "bg-indigo-500",
  },
  slate: {
    card: "border-slate-200/80 bg-gradient-to-br from-slate-50 to-white",
    label: "text-slate-600/90",
    value: "text-slate-900",
    hint: "text-slate-500",
    bar: "bg-slate-500",
  },
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
};

export function ProfileStats({
  displayName,
  role,
  modules,
  storage,
  mustChange,
}: Props) {
  const stats = [
    {
      label: "Display name",
      value: displayName.length > 14 ? `${displayName.slice(0, 12)}…` : displayName,
      hint: "Ops attribution",
      tone: "indigo" as const,
    },
    {
      label: "Role",
      value: role,
      hint: "Seat class",
      tone: "slate" as const,
    },
    {
      label: "Modules",
      value: String(modules),
      hint: "From token ACL",
      tone: "sky" as const,
    },
    {
      label: "Login scope",
      value: storage === "Browser session" ? "Session" : storage,
      hint: storage,
      tone: "emerald" as const,
    },
    {
      label: "Password",
      value: mustChange ? "Reset due" : "Current",
      hint: mustChange ? "Change required" : "No forced reset",
      tone: mustChange ? ("amber" as const) : ("emerald" as const),
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
              className={`mt-1.5 pl-2 text-[20px] font-semibold tracking-[-0.03em] ${t.value}`}
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
