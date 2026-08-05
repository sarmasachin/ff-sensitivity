type Props = {
  onSave?: () => void;
  onReset?: () => void;
};

export function ProfileHeader({ onSave, onReset }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-800/40 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-8 h-52 w-52 rounded-full bg-indigo-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-8 h-44 w-44 rounded-full bg-slate-400/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-indigo-200/70 uppercase">
            Account
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Profile
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/80">
            Your operator identity, contact channel, and password for this
            console seat. Seat ACL stays on Staff — this page is about you,
            not the org chart.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="h-10 rounded-xl border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white backdrop-blur-sm hover:bg-white/15"
            >
              Reset draft
            </button>
          ) : null}
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-slate-900 hover:bg-indigo-50"
            >
              Save profile
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
