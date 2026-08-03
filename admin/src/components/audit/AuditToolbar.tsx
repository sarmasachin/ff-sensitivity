"use client";

export type AuditFilterKey =
  | "all"
  | "today"
  | "login"
  | "redeem"
  | "inventory"
  | "staff"
  | "wallet"
  | "config"
  | "denied";

type Props = {
  query: string;
  filter: AuditFilterKey;
  onQuery: (q: string) => void;
  onFilter: (f: AuditFilterKey) => void;
};

const FILTERS: { id: AuditFilterKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "24h" },
  { id: "login", label: "Login" },
  { id: "redeem", label: "Redeem" },
  { id: "inventory", label: "Inventory" },
  { id: "staff", label: "Staff" },
  { id: "wallet", label: "Wallet" },
  { id: "config", label: "Config" },
  { id: "denied", label: "Denied" },
];

export function AuditToolbar({ query, filter, onQuery, onFilter }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e8eaee] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center">
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search actor, action, target, detail…"
        className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-[13px] text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
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
