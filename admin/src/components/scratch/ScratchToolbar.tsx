"use client";

export type ScratchFilterKey =
  | "all"
  | "live"
  | "disabled"
  | "GIFT"
  | "MILESTONE"
  | "REDEEM"
  | "SHOP";

type Props = {
  query: string;
  filter: ScratchFilterKey;
  onQuery: (v: string) => void;
  onFilter: (v: ScratchFilterKey) => void;
  onAdd?: () => void;
};

const FILTERS: { id: ScratchFilterKey; label: string; active: string }[] = [
  { id: "all", label: "All", active: "bg-slate-900 text-white" },
  { id: "live", label: "Live", active: "bg-emerald-600 text-white" },
  { id: "disabled", label: "Disabled", active: "bg-slate-500 text-white" },
  { id: "GIFT", label: "Gift pool", active: "bg-fuchsia-600 text-white" },
  { id: "MILESTONE", label: "Milestone", active: "bg-violet-600 text-white" },
  { id: "REDEEM", label: "Redeem", active: "bg-indigo-600 text-white" },
  { id: "SHOP", label: "Shop", active: "bg-amber-500 text-white" },
];

export function ScratchToolbar({
  query,
  filter,
  onQuery,
  onFilter,
  onAdd,
}: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilter(f.id)}
              className={[
                "h-8 rounded-lg px-3 text-[12px] font-medium transition-colors",
                active
                  ? f.active
                  : "bg-white text-[#64748b] ring-1 ring-[#e8eaee] hover:text-[#0f172a]",
              ].join(" ")}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:max-w-none">
        <label className="relative w-full sm:min-w-[220px] lg:w-[260px]">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#94a3b8]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M16.5 16.5 20 20"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search title or reward…"
            className="h-9 w-full rounded-xl border-0 bg-white pr-3 pl-9 text-[13px] text-[#0f172a] outline-none ring-1 ring-[#e8eaee] placeholder:text-[#94a3b8] focus:ring-2 focus:ring-fuchsia-500/30"
          />
        </label>
        <button
          type="button"
          onClick={onAdd}
          className="h-9 shrink-0 rounded-xl bg-fuchsia-600 px-3.5 text-[13px] font-semibold text-white hover:bg-fuchsia-500"
        >
          Add prize
        </button>
      </div>
    </div>
  );
}
