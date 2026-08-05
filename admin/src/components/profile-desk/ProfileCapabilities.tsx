import { PROFILE_CAPABILITIES } from "./profile-data";

const ACCENTS = [
  "border-l-indigo-500 bg-indigo-50/50",
  "border-l-slate-500 bg-slate-50/50",
  "border-l-sky-500 bg-sky-50/50",
  "border-l-emerald-500 bg-emerald-50/50",
  "border-l-amber-500 bg-amber-50/50",
  "border-l-stone-400 bg-stone-50/50",
];

export function ProfileCapabilities() {
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5">
      <h2 className="text-[14px] font-semibold text-[#0f172a]">
        What this module includes
      </h2>
      <p className="mt-1 text-[12px] text-[#94a3b8]">
        Live on Nest — GET/PATCH /auth/me and POST /auth/password.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PROFILE_CAPABILITIES.map((item, i) => (
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
