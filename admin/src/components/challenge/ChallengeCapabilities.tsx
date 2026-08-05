import { CHALLENGE_CAPABILITIES } from "./challenge-data";

const ACCENTS = [
  "border-l-orange-500 bg-orange-50/50",
  "border-l-rose-500 bg-rose-50/50",
  "border-l-amber-500 bg-amber-50/50",
  "border-l-fuchsia-500 bg-fuchsia-50/50",
  "border-l-emerald-500 bg-emerald-50/50",
  "border-l-slate-400 bg-slate-50/50",
];

export function ChallengeCapabilities() {
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5">
      <h2 className="text-[14px] font-semibold text-[#0f172a]">
        What this module covers
      </h2>
      <p className="mt-1 text-[12px] text-[#94a3b8]">
        Live Nest challenge config — rules, quiz bank, and streak milestones.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CHALLENGE_CAPABILITIES.map((item, i) => (
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
