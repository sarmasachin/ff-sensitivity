import { CLAIM_RESULT_LABEL, type ClaimListRow } from "./claims-data";

type Props = {
  open: boolean;
  row: ClaimListRow | null;
  onClose: () => void;
};

export function ClaimsDetailDrawer({ open, row, onClose }: Props) {
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
            <p className="text-[11px] font-semibold tracking-[0.12em] text-sky-700 uppercase">
              Claim detail
            </p>
            <h2 className="mt-1 truncate text-[18px] font-bold tracking-[-0.02em] text-slate-900">
              {row.title}
            </h2>
            <p className="mt-0.5 font-mono text-[12px] text-slate-500">
              {row.codeMasked}
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
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-3 text-[12px] font-medium text-sky-900">
            Trigger: <span className="font-bold">Copy tap</span> after code
            unlock. View-only sessions are never logged here.
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Result
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {CLAIM_RESULT_LABEL[row.result]}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Stock after
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                {row.stockAfter}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Device
              </dt>
              <dd className="mt-0.5 font-mono text-[12px] font-semibold text-slate-900">
                {row.deviceId}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                When
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {row.whenLabel}
              </dd>
            </div>
          </dl>

          <p className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Abuse score
          </p>
          <div className="rounded-xl border border-slate-100 px-3.5 py-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-slate-600">Risk</span>
              <span className="font-bold tabular-nums text-slate-900">
                {row.abuseScore}/100
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={[
                  "h-full rounded-full",
                  row.abuseScore >= 60
                    ? "bg-rose-500"
                    : row.abuseScore >= 30
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                ].join(" ")}
                style={{ width: `${Math.min(100, row.abuseScore)}%` }}
              />
            </div>
          </div>

          <p className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Ops note
          </p>
          <p className="rounded-xl border border-sky-100 bg-sky-50/50 px-3.5 py-3 text-[13px] leading-relaxed text-slate-700">
            {row.note}
          </p>
        </div>
      </aside>
    </div>
  );
}
