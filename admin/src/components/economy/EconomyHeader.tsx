type Props = {
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
};

export function EconomyHeader({ dirty, onSave, onReset }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-600 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 left-16 h-32 w-32 rounded-full bg-emerald-300/25 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/75 uppercase">
            Rewards
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Economy
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/90">
            Daily coin earn rates for Android — check-in, quiz, ad bonus, wallet
            caps. Local draft until Economy API is connected.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={!dirty}
            className="h-10 rounded-xl border border-white/30 bg-white/10 px-3.5 text-[13px] font-medium text-white backdrop-blur-sm hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty}
            className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save draft
          </button>
        </div>
      </div>
    </header>
  );
}
