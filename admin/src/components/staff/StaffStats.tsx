type Props = {
  total: number;
  active: number;
  invited: number;
  disabled: number;
  admins: number;
};

const TONE = {
  zinc: {
    card: "border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-white",
    label: "text-zinc-600/90",
    value: "text-zinc-900",
    hint: "text-zinc-500",
    bar: "bg-zinc-500",
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
  sky: {
    card: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white",
    label: "text-sky-700/80",
    value: "text-sky-950",
    hint: "text-sky-700/60",
    bar: "bg-sky-500",
  },
};

export function StaffStats({
  total,
  active,
  invited,
  disabled,
  admins,
}: Props) {
  const stats = [
    {
      label: "Accounts",
      value: String(total),
      hint: "Staff seats",
      tone: "zinc" as const,
    },
    {
      label: "Active",
      value: String(active),
      hint: "Can sign in",
      tone: "emerald" as const,
    },
    {
      label: "Invited",
      value: String(invited),
      hint: "Pending accept",
      tone: "amber" as const,
    },
    {
      label: "Disabled",
      value: String(disabled),
      hint: "Access revoked",
      tone: "rose" as const,
    },
    {
      label: "Admins",
      value: String(admins),
      hint: "Super + Admin",
      tone: "sky" as const,
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
