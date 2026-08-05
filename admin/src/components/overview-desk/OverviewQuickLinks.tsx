import Link from "next/link";
import { OVERVIEW_LINKS } from "./overview-data";

export function OverviewQuickLinks() {
  const pulse = OVERVIEW_LINKS.filter((l) => l.group === "pulse");
  const app = OVERVIEW_LINKS.filter((l) => l.group === "app");
  const system = OVERVIEW_LINKS.filter((l) => l.group === "system");

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
        Jump
      </p>
      <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
        All desks in one place
      </h2>
      <p className="mt-0.5 text-[12px] text-slate-500">
        Open any module from Overview — no hunting in the sidebar.
      </p>

      <Group title="Pulse" links={pulse} />
      <Group title="App" links={app} />
      <Group title="System" links={system} />
    </section>
  );
}

function Group({
  title,
  links,
}: {
  title: string;
  links: typeof OVERVIEW_LINKS;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
        {title}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 hover:border-sky-200 hover:bg-sky-50/50"
          >
            <p className="text-[13px] font-semibold text-slate-900">{l.label}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{l.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
