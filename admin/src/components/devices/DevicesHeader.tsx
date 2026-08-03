type Props = {
  onRefresh?: () => void;
  onExport?: () => void;
};

export function DevicesHeader({ onRefresh, onExport }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-indigo-900/40 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 -right-10 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-violet-400/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-indigo-200/70 uppercase">
            Registry
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Devices
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/80">
            Registered Android installs and FCM tokens for push targeting,
            abuse blocks, and version gates — staff ops desk, not a gadget
            gallery.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="h-10 rounded-xl border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white backdrop-blur-sm hover:bg-white/15"
            >
              Refresh
            </button>
          ) : null}
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-indigo-900 hover:bg-indigo-50"
            >
              Export CSV
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
