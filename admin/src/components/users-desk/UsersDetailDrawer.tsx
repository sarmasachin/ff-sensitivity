import {
  USER_STATUS_LABEL,
  type UserListRow,
} from "./users-data";
import { UsersScreenJourney } from "./UsersScreenJourney";
import { UsersActivityFeed } from "./UsersActivityFeed";

type Props = {
  open: boolean;
  row: UserListRow | null;
  onClose: () => void;
  onRestrict: (id: string) => void;
  onSuspend: (id: string) => void;
  onRestore: (id: string) => void;
};

export function UsersDetailDrawer({
  open,
  row,
  onClose,
  onRestrict,
  onSuspend,
  onRestore,
}: Props) {
  if (!open || !row) return null;

  const initial = row.displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-cyan-700 uppercase">
              User profile
            </p>
            <h2 className="mt-1 truncate text-[18px] font-bold tracking-[-0.02em] text-slate-900">
              {row.displayName}
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-slate-500">
              {row.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50 to-white px-4 py-3.5">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-[20px] font-semibold text-white"
              aria-hidden
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-slate-900">
                {row.displayName}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-cyan-800">
                Google Sign-In · {USER_STATUS_LABEL[row.status]}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-500">
                {row.googleSubMasked}
              </p>
            </div>
          </div>

          <section className="mt-4">
            <h3 className="text-[11px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
              Identity
            </h3>
            <dl className="mt-2 grid grid-cols-1 gap-2 text-[13px]">
              <Detail label="Email" value={row.email} />
              <Detail label="Joined" value={row.joinedLabel} />
              <Detail label="Region" value={row.regionLabel} />
              <Detail label="Last active" value={row.lastActiveLabel} />
            </dl>
          </section>

          <section className="mt-5">
            <h3 className="text-[11px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
              Linked device
            </h3>
            <dl className="mt-2 grid grid-cols-1 gap-2 text-[13px]">
              <Detail label="Handset" value={row.deviceLabel} />
              <Detail label="Device id" value={row.deviceId} mono />
              <Detail label="App version" value={row.appVersion} />
            </dl>
          </section>

          <section className="mt-5">
            <h3 className="text-[11px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
              Economy
            </h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Metric label="Coins" value={row.coinBalance.toLocaleString()} />
              <Metric label="Claims" value={String(row.claimsCount)} />
              <Metric label="Unlocks" value={String(row.redeemUnlocks)} />
            </div>
          </section>

          <UsersScreenJourney userId={row.id} />

          <UsersActivityFeed userId={row.id} />

          <section className="mt-5">
            <h3 className="text-[11px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
              Ops note
            </h3>
            <p className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 text-[13px] leading-relaxed text-slate-700">
              {row.note}
            </p>
          </section>
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
          {row.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={() => onRestrict(row.id)}
              className="h-10 flex-1 rounded-xl border border-amber-200 bg-amber-50 text-[13px] font-semibold text-amber-950 hover:bg-amber-100"
            >
              Restrict
            </button>
          ) : null}
          {row.status === "ACTIVE" || row.status === "RESTRICTED" ? (
            <button
              type="button"
              onClick={() => onSuspend(row.id)}
              className="h-10 flex-1 rounded-xl border border-rose-200 bg-rose-50 text-[13px] font-semibold text-rose-950 hover:bg-rose-100"
            >
              Suspend
            </button>
          ) : null}
          {row.status === "RESTRICTED" || row.status === "SUSPENDED" ? (
            <button
              type="button"
              onClick={() => onRestore(row.id)}
              className="h-10 flex-1 rounded-xl bg-slate-900 text-[13px] font-semibold text-white hover:bg-slate-800"
            >
              Restore account
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </dt>
      <dd
        className={[
          "mt-0.5 font-medium text-slate-900",
          mono ? "font-mono text-[12px]" : "text-[13px]",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
