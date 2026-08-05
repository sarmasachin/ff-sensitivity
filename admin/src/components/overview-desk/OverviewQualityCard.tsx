import type { OverviewP3 } from "./overview-data";
import { formatCompact } from "./overview-data";

type Props = {
  p3: OverviewP3;
};

export function OverviewQualityCard({ p3 }: Props) {
  const screen = p3.screenTime;
  const health = p3.installHealth;
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-sky-700/70 uppercase">
        Quality · P3
      </p>
      <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
        Screen time &amp; install health
      </h2>
      <p className="mt-0.5 text-[12px] text-slate-500">
        UTC today. “Suspected uninstall” means FCM reported an unregistered
        token; it is not a Play Store uninstall count.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat
          label="Screen time"
          value={formatDuration(screen.screenTimeTodaySeconds)}
        />
        <Stat
          label="Avg screen"
          value={formatDuration(screen.avgScreenSeconds)}
        />
        <Stat
          label="Tracked users"
          value={formatCompact(screen.trackedUsersToday)}
        />
        <Stat
          label="Screen visits"
          value={formatCompact(screen.screenVisitsToday)}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Suspected uninstall"
          value={formatCompact(health.suspectedUninstalls)}
        />
        <Stat
          label="Registered, no open"
          value={formatCompact(health.registeredWithoutOpenEvent)}
        />
        <Stat label="Stale 72h" value={formatCompact(health.stale72h)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            Top screens today
          </p>
          {screen.topScreens.length === 0 ? (
            <p className="mt-2 text-[13px] text-slate-500">
              No completed screen visits yet.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {screen.topScreens.map((row) => (
                <li
                  key={row.screen}
                  className="flex items-center justify-between gap-3 py-2 first:pt-0"
                >
                  <span className="font-mono text-[12px] text-slate-700">
                    {row.screen}
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums text-slate-900">
                    {formatDuration(row.seconds)} · {row.visits} visits
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            Crash reporting
          </p>
          <p className="mt-1 text-[13px] text-slate-700">
            Firebase Crashlytics is the source of truth. Nest does not invent a
            crash count without Firebase data.
          </p>
          <a
            href={p3.crashReporting.dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-[12px] font-semibold text-sky-700 hover:text-sky-900"
          >
            Open Crashlytics ↗
          </a>
        </div>
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}
