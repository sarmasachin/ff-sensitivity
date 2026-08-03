type Props = {
  onRefresh?: () => void;
};

export function CommunityHeader({ onRefresh }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-700/40 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-indigo-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-slate-400/15 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/60 uppercase">
            Moderation
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Community
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/80">
            Review shared sensitivity cards from Android — approve, feature, or
            hide before they hit the public feed.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="h-10 shrink-0 rounded-xl border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white backdrop-blur-sm hover:bg-white/15"
        >
          Refresh queue
        </button>
      </div>
    </header>
  );
}
