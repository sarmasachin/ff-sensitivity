type Props = {
  onExport?: () => void;
};

export function ClaimsHeader({ onExport }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-cyan-200/60 bg-gradient-to-r from-cyan-700 via-sky-600 to-blue-700 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-14 left-12 h-36 w-36 rounded-full bg-cyan-300/20 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/70 uppercase">
            Ledger
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Claims
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/90">
            Redeem codes claimed only when the user taps Copy — unlock without
            Copy never appears here.
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="h-10 shrink-0 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-sky-800 hover:bg-sky-50"
        >
          Export CSV
        </button>
      </div>
    </header>
  );
}
