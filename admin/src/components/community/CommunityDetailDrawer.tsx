import { kdOf, type CommunityListRow } from "./community-data";

type Props = {
  open: boolean;
  row: CommunityListRow | null;
  onClose: () => void;
};

const SENSI_KEYS = [
  ["General", "general"],
  ["Red Dot", "redDot"],
  ["2x", "scope2x"],
  ["4x", "scope4x"],
  ["AWM", "awm"],
  ["Free look", "freeLook"],
] as const;

export function CommunityDetailDrawer({ open, row, onClose }: Props) {
  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-[400px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
              Post preview
            </p>
            <h2 className="mt-1 truncate text-[18px] font-bold tracking-[-0.02em] text-slate-900">
              {row.name}
            </h2>
            <p className="mt-0.5 font-mono text-[12px] text-slate-500">
              FF ID {row.freeFireId}
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
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Rank
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{row.rank}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Role
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{row.role}</dd>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Device
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {row.deviceLabel}
              </dd>
              <dd className="mt-0.5 text-[12px] text-slate-500">{row.deviceMeta}</dd>
            </div>
          </dl>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ["Matches", row.matches],
              ["Kills", row.kills],
              ["HS", row.headshots],
              ["KD", kdOf(row)],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-slate-100 px-2 py-2 text-center"
              >
                <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  {label}
                </p>
                <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-slate-900">
                  {typeof value === "number" ? value.toLocaleString() : value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Sensitivity
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SENSI_KEYS.map(([label, key]) => (
              <div
                key={key}
                className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-2.5 py-2"
              >
                <p className="text-[10px] font-semibold text-indigo-700/70 uppercase">
                  {label}
                </p>
                <p className="mt-0.5 text-[16px] font-bold tabular-nums text-indigo-950">
                  {row[key]}
                </p>
              </div>
            ))}
          </div>

          {row.reports > 0 ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] font-medium text-rose-800">
              {row.reports} user report{row.reports === 1 ? "" : "s"} on this
              card — review carefully before approve.
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
