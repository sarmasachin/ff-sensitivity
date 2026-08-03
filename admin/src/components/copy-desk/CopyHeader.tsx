type Props = {
  onSave?: () => void;
  onReset?: () => void;
};

export function CopyHeader({ onSave, onReset }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-violet-900/40 bg-gradient-to-r from-slate-950 via-violet-950 to-slate-900 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 -right-10 h-48 w-48 rounded-full bg-violet-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-fuchsia-400/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-violet-200/70 uppercase">
            Content
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Copy
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/80">
            Remote marketing strings — rate-app prompt, share sheet, About
            blurbs, and legal link labels. Editorial ops desk, not a slogan
            playground.
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
              className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-violet-900 hover:bg-violet-50"
            >
              Save copy
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
