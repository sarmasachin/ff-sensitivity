import type { OverviewEngagement } from "./overview-data";
import { formatCompact } from "./overview-data";

type Props = {
  engagement: OverviewEngagement;
};

export function OverviewEngagementCard({ engagement }: Props) {
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-700/70 uppercase">
        Engagement
      </p>
      <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
        App events (P1)
      </h2>
      <p className="mt-0.5 text-[12px] text-slate-500">
        DAU/MAU from opens. Feature events from Nest (redeem, scratch, quiz) +
        server logout / anonymous open.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="DAU" value={formatCompact(engagement.dauToday)} />
        <Stat label="MAU 30d" value={formatCompact(engagement.mau30d)} />
        <Stat label="Events today" value={formatCompact(engagement.eventsToday)} />
        <Stat label="Logouts today" value={String(engagement.logoutToday)} />
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
          Top events today
        </p>
        {engagement.topEvents.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate-500">
            No events yet — open the app or run a claim / scratch / quiz.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {engagement.topEvents.map((e) => (
              <li
                key={e.name}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="font-mono text-[12px] text-slate-700">
                  {e.name}
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-slate-900">
                  {e.count}
                </span>
              </li>
            ))}
          </ul>
        )}
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
