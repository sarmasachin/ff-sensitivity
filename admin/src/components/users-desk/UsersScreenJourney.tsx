import { useEffect, useState } from "react";
import {
  fetchUserScreenJourney,
  type UserScreenJourney,
} from "./users-api";

type Props = {
  userId: string;
};

export function UsersScreenJourney({ userId }: Props) {
  const [data, setData] = useState<UserScreenJourney | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    void fetchUserScreenJourney(userId, 7)
      .then((journey) => {
        if (!cancelled) setData(journey);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load screen journey.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
          Screen journey
        </h3>
        <span className="text-[11px] font-medium text-slate-400">Last 7 days</span>
      </div>

      {loading ? (
        <p className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 text-[13px] text-slate-500">
          Loading visits…
        </p>
      ) : null}

      {!loading && error ? (
        <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50/70 px-3.5 py-3 text-[13px] text-rose-800">
          {error}
        </p>
      ) : null}

      {!loading && !error && data ? <JourneyBody data={data} /> : null}
    </section>
  );
}

function JourneyBody({ data }: { data: UserScreenJourney }) {
  const { summary, byScreen, timeline } = data;
  if (summary.visits === 0) {
    return (
      <p className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 text-[13px] text-slate-500">
        No completed screen visits in the last {data.days} days.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Visits" value={String(summary.visits)} />
        <Metric label="Time" value={formatDuration(summary.totalSeconds)} />
        <Metric label="Screens" value={String(summary.uniqueScreens)} />
      </div>

      {byScreen.length > 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Top screens
          </p>
          <ul className="mt-1.5 divide-y divide-slate-100">
            {byScreen.slice(0, 6).map((row) => (
              <li
                key={row.screen}
                className="flex items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0"
              >
                <span className="truncate font-mono text-[12px] text-slate-700">
                  {row.screen}
                </span>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-900">
                  {formatDuration(row.seconds)} · {row.visits}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
        <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          Timeline
        </p>
        <ol className="relative mt-2 space-y-0 border-l border-cyan-200/80 pl-3">
          {timeline.map((row) => (
            <li key={row.id} className="relative pb-3 last:pb-0">
              <span
                className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-white"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[12px] font-medium text-slate-800">
                    {row.screen}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {formatWhen(row.at)}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-slate-900">
                  {formatDuration(row.seconds)}
                </span>
              </div>
            </li>
          ))}
        </ol>
        {timeline.length >= 80 ? (
          <p className="mt-2 text-[11px] text-slate-400">
            Showing latest 80 visits.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) {
    return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin === 0 ? `${hours}h` : `${hours}h ${remMin}m`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
