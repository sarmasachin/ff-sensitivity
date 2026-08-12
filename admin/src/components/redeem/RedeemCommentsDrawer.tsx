"use client";

type Props = {
  open: boolean;
  codeId: string | null;
  codeTitle: string;
  onClose: () => void;
};

export function RedeemCommentsDrawer({
  open,
  codeId,
  codeTitle,
  onClose,
}: Props) {
  if (!open || !codeId) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        aria-label="Close comments"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl ring-1 ring-slate-200">
        <header className="shrink-0 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-indigo-600 uppercase">
                Comments
              </p>
              <h2 className="mt-1 truncate text-[16px] font-bold text-slate-900">
                {codeTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="max-w-xs text-center text-[13px] leading-relaxed text-slate-400">
            No server comments yet. Players post comments on-device in the app;
            they are not stored in this inventory.
          </p>
        </div>
      </aside>
    </div>
  );
}
