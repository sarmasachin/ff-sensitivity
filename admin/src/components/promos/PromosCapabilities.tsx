import { PROMOS_CAPABILITIES } from "./promo-data";

export function PromosCapabilities() {
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-amber-800 uppercase">
        Scope
      </p>
      <h2 className="mt-1 text-[15px] font-bold text-slate-900">
        What this page controls
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {PROMOS_CAPABILITIES.map((item) => (
          <li
            key={item.title}
            className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3"
          >
            <p className="text-[13px] font-semibold text-slate-900">
              {item.title}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
