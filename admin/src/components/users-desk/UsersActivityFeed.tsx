import { useEffect, useState } from "react";
import {
  fetchUserActivityFeed,
  type UserActivityFeed,
  type UserActivityItem,
} from "./users-api";

type Props = {
  userId: string;
};

const EVENT_LABEL: Record<string, string> = {
  app_open: "App open",
  login: "Login",
  redeem_claim: "Claim",
  scratch_roll: "Scratch",
  logout: "Logout",
};

export function UsersActivityFeed({ userId }: Props) {
  const [data, setData] = useState<UserActivityFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    void fetchUserActivityFeed(userId, 7)
      .then((feed) => {
        if (!cancelled) setData(feed);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load activity feed.",
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
          Activity feed
        </h3>
        <span className="text-[11px] font-medium text-slate-400">Last 7 days</span>
      </div>

      {loading ? (
        <p className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 text-[13px] text-slate-500">
          Loading activity…
        </p>
      ) : null}

      {!loading && error ? (
        <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50/70 px-3.5 py-3 text-[13px] text-rose-800">
          {error}
        </p>
      ) : null}

      {!loading && !error && data ? <FeedBody data={data} /> : null}
    </section>
  );
}

function FeedBody({ data }: { data: UserActivityFeed }) {
  const { summary, items } = data;
  if (summary.total === 0) {
    return (
      <p className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 text-[13px] text-slate-500">
        No app opens, logins, claims, scratches, or logouts in the last{" "}
        {data.days} days.
      </p>
    );
  }

  const chips: Array<{ key: keyof typeof summary.counts; label: string }> = [
    { key: "app_open", label: "Opens" },
    { key: "login", label: "Logins" },
    { key: "redeem_claim", label: "Claims" },
    { key: "scratch_roll", label: "Scratch" },
    { key: "logout", label: "Logout" },
  ];

  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
          >
            <span className="text-slate-400">{chip.label}</span>
            <span className="tabular-nums font-semibold text-slate-900">
              {summary.counts[chip.key]}
            </span>
          </span>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
        <ol className="relative space-y-0 border-l border-slate-200 pl-3">
          {items.map((item) => (
            <FeedRow key={item.id} item={item} />
          ))}
        </ol>
        {items.length >= 80 ? (
          <p className="mt-2 text-[11px] text-slate-400">
            Showing latest 80 events.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FeedRow({ item }: { item: UserActivityItem }) {
  return (
    <li className="relative pb-3 last:pb-0">
      <span
        className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-slate-500 ring-2 ring-white"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-900">
          {EVENT_LABEL[item.name] ?? item.name}
          {item.detail ? (
            <span className="ml-1.5 font-mono text-[11px] font-medium text-slate-500">
              {item.detail}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">{formatWhen(item.at)}</p>
      </div>
    </li>
  );
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
