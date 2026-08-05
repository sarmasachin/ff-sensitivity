import type { OverviewFunnel } from "./overview-data";
import { formatCompact } from "./overview-data";

type Props = {
  funnel: OverviewFunnel;
};

/** UTC-day conversion funnel — install → open → signup → first claim. */
export function OverviewFunnelCard({ funnel }: Props) {
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-emerald-700/70 uppercase">
        Funnel
      </p>
      <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
        Today (UTC) · P2
      </h2>
      <p className="mt-0.5 text-[12px] text-slate-500">
        New installs → first app open → signups → users whose first redeem claim
        landed today.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Installs" value={formatCompact(funnel.installsToday)} />
        <Stat label="First open" value={formatCompact(funnel.firstOpenToday)} />
        <Stat label="Signups" value={formatCompact(funnel.signupsToday)} />
        <Stat
          label="First claim"
          value={formatCompact(funnel.firstClaimsToday)}
        />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
