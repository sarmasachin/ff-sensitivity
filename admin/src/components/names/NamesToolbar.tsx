"use client";

export type NamesFilterKey = "all" | "live" | "disabled" | "premium";

type Props = {
  query: string;
  filter: NamesFilterKey;
  onQuery: (q: string) => void;
  onFilter: (f: NamesFilterKey) => void;
  placeholder?: string;
};

const FILTERS: { id: NamesFilterKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "disabled", label: "Off" },
  { id: "premium", label: "Premium" },
];

export function NamesToolbar({
  query,
  filter,
  onQuery,
  onFilter,
  placeholder = "Search id, label, prefix…",
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e8eaee] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center">
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={placeholder}
        className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-[13px] text-slate-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
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
