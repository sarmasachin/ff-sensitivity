import { OVERVIEW_CAPABILITIES } from "./overview-data";

const ACCENTS = [
  "border-l-sky-400",
  "border-l-emerald-400",
  "border-l-amber-400",
  "border-l-rose-400",
  "border-l-indigo-400",
  "border-l-teal-400",
];

export function OverviewCapabilities() {
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
        What this desk includes
      </p>
      <p className="mt-0.5 text-[12px] text-slate-500">
        Live Nest Overview — Viewers can read if Overview module is assigned.
      </p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {OVERVIEW_CAPABILITIES.map((c, i) => (
          <div
            key={c.title}
            className={`rounded-xl border border-[#f1f5f9] border-l-4 px-3.5 py-3 ${ACCENTS[i % ACCENTS.length]}`}
          >
            <p className="text-[13px] font-semibold text-slate-900">{c.title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
              {c.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
