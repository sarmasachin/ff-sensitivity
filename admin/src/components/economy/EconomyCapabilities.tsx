import { ECONOMY_CAPABILITIES } from "./economy-data";

const ACCENTS = [
  "border-l-emerald-500 bg-emerald-50/50",
  "border-l-teal-500 bg-teal-50/50",
  "border-l-cyan-500 bg-cyan-50/50",
  "border-l-amber-500 bg-amber-50/50",
  "border-l-slate-400 bg-slate-50/50",
  "border-l-violet-500 bg-violet-50/50",
];

export function EconomyCapabilities() {
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5">
      <h2 className="text-[14px] font-semibold text-[#0f172a]">
        What this module will include
      </h2>
      <p className="mt-1 text-[12px] text-[#94a3b8]">
        UI shell now — NestJS economy config wire-up next.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ECONOMY_CAPABILITIES.map((item, i) => (
          <li
            key={item.title}
            className={`rounded-xl border border-[#f1f5f9] border-l-4 px-3.5 py-3 ${ACCENTS[i % ACCENTS.length]}`}
          >
            <p className="text-[13px] font-semibold text-[#0f172a]">
              {item.title}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#64748b]">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
