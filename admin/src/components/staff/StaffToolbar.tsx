"use client";

export type StaffFilterKey =
  | "all"
  | "active"
  | "invited"
  | "disabled"
  | "admin"
  | "sub"
  | "viewer";

type Props = {
  query: string;
  filter: StaffFilterKey;
  onQuery: (q: string) => void;
  onFilter: (f: StaffFilterKey) => void;
};

const FILTERS: { id: StaffFilterKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "invited", label: "Invited" },
  { id: "disabled", label: "Disabled" },
  { id: "admin", label: "Admins" },
  { id: "sub", label: "Sub-Admin" },
  { id: "viewer", label: "Viewer" },
];

export function StaffToolbar({ query, filter, onQuery, onFilter }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e8eaee] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center">
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search name, email, note…"
        className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-[13px] text-slate-900 outline-none focus:border-zinc-500 focus:bg-white focus:ring-4 focus:ring-zinc-500/10"
      />
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilter(f.id)}
              className={[
                "h-9 rounded-lg px-3 text-[12px] font-semibold",
                on
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
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
