type Props = {
  onRefresh?: () => void;
};

export function SupportHeader({ onRefresh }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 -right-10 h-48 w-48 rounded-full bg-sky-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-12 h-40 w-40 rounded-full bg-slate-400/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-sky-200/70 uppercase">
            Inbox
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Support
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/80">
            Contact Us tickets from the app — live Nest triage, reply, and close.
            Staff ACL on the support module.
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="h-10 shrink-0 rounded-xl border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white backdrop-blur-sm hover:bg-white/15"
          >
            Refresh inbox
          </button>
        ) : null}
      </div>
    </header>
  );
}
