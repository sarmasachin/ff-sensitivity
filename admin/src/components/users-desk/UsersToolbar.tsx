"use client";

export type UsersFilterKey =
  | "all"
  | "active"
  | "restricted"
  | "suspended"
  | "stale";

type Props = {
  query: string;
  filter: UsersFilterKey;
  onQuery: (q: string) => void;
  onFilter: (f: UsersFilterKey) => void;
};

const FILTERS: { id: UsersFilterKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "restricted", label: "Restricted" },
  { id: "suspended", label: "Suspended" },
  { id: "stale", label: "Stale" },
];

export function UsersToolbar({ query, filter, onQuery, onFilter }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e8eaee] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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
          placeholder="Search name, email, device id…"
          className="h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pr-3 pl-9 text-[13px] text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const selected = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilter(f.id)}
              className={[
                "h-9 rounded-lg px-3 text-[12px] font-semibold transition-colors",
                selected
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80",
              ].join(" ")}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
