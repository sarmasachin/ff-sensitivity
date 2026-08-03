import Link from "next/link";
import { ECONOMY_BOOST_NOTES } from "./economy-data";

export function EconomyBoostNotes() {
  return (
    <section className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-amber-800 uppercase">
            Stacks from Shop
          </p>
          <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
            Boost modifiers
          </h2>
          <p className="mt-0.5 max-w-xl text-[12px] text-slate-500">
            These multiply or add on top of Economy base rates. Catalog lives in
            Shop — do not duplicate prices here.
          </p>
        </div>
        <Link
          href="/shop"
          prefetch={false}
          className="mt-2 inline-flex h-8 shrink-0 items-center rounded-lg bg-amber-600 px-3 text-[12px] font-semibold text-white hover:bg-amber-500 sm:mt-0"
        >
          Open Shop
        </Link>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {ECONOMY_BOOST_NOTES.map((b) => (
          <li
            key={b.id}
            className="rounded-xl border border-amber-100 bg-white/80 px-3.5 py-3"
          >
            <p className="text-[13px] font-semibold text-slate-900">{b.title}</p>
            <p className="mt-1 font-mono text-[11px] text-amber-800/80">{b.id}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
              {b.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
