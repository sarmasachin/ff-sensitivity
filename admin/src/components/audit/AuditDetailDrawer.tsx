import {
  AUDIT_CATEGORY_LABEL,
  AUDIT_RESULT_LABEL,
  type AuditListRow,
} from "./audit-data";

type Props = {
  open: boolean;
  row: AuditListRow | null;
  onClose: () => void;
};

export function AuditDetailDrawer({ open, row, onClose }: Props) {
  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-blue-700 uppercase">
              Audit event
            </p>
            <h2 className="mt-1 truncate text-[18px] font-bold tracking-[-0.02em] text-slate-900">
              {row.action}
            </h2>
            <p className="mt-0.5 font-mono text-[12px] text-slate-500">
              {row.id} · {row.atLabel}
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
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-3 text-[12px] font-medium text-blue-950">
            Immutable record — this console cannot edit or delete audit rows.
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Category
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {AUDIT_CATEGORY_LABEL[row.category]}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Result
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {AUDIT_RESULT_LABEL[row.result]}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Actor
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {row.actorName}
              </dd>
              <dd className="mt-0.5 text-[12px] text-slate-500">
                {row.actorEmail}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Target
              </dt>
              <dd className="mt-0.5 font-mono text-[12px] font-semibold text-slate-900">
                {row.target}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Client
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {row.ipLabel}
              </dd>
            </div>
          </dl>

          <p className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Detail
          </p>
          <p className="rounded-xl border border-blue-100 bg-blue-50/50 px-3.5 py-3 text-[13px] leading-relaxed text-slate-700">
            {row.detail}
          </p>
        </div>
      </aside>
    </div>
  );
}
