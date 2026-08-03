type Props = {
  onSave?: () => void;
  onReset?: () => void;
};

export function SettingsHeader({ onSave, onReset }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-stone-800/50 bg-gradient-to-r from-slate-950 via-stone-900 to-orange-950 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 -right-10 h-48 w-48 rounded-full bg-orange-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-stone-400/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-orange-200/60 uppercase">
            Console
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Settings
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/80">
            Ops desk preferences and session policy. App toggles live under
            App; seats under Staff; trail under Audit — not a toy options
            screen.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="h-10 rounded-xl border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white backdrop-blur-sm hover:bg-white/15"
            >
              Reset defaults
            </button>
          ) : null}
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-stone-900 hover:bg-orange-50"
            >
              Save settings
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
