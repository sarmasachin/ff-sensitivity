import { USERS_CAPABILITIES } from "./users-data";

const ACCENTS = [
  "border-l-cyan-500 bg-cyan-50/50",
  "border-l-slate-500 bg-slate-50/50",
  "border-l-sky-500 bg-sky-50/50",
  "border-l-amber-500 bg-amber-50/50",
  "border-l-emerald-500 bg-emerald-50/50",
  "border-l-rose-400 bg-rose-50/50",
];

export function UsersCapabilities() {
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5">
      <h2 className="text-[14px] font-semibold text-[#0f172a]">
        What this module covers
      </h2>
      <p className="mt-1 text-[12px] text-[#94a3b8]">
        Live Nest User table — Google seats, status gates, masked PII.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {USERS_CAPABILITIES.map((item, i) => (
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
