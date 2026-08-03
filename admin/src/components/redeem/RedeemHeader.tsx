type Props = {
  onAdd?: () => void;
  onImport?: () => void;
  onClaimLog?: () => void;
};

export function RedeemHeader({ onAdd, onImport, onClaimLog }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 left-20 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/75 uppercase">
            Inventory
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Redeem
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/85">
            Gift-code inventory for the Android app — masked in list, stock-safe
            claims, daily and weekly pools.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClaimLog}
            className="h-10 rounded-xl border border-white/30 bg-white/10 px-3.5 text-[13px] font-medium text-white backdrop-blur-sm hover:bg-white/20"
          >
            Claim log
          </button>
          <button
            type="button"
            onClick={onImport}
            className="h-10 rounded-xl border border-white/30 bg-white/10 px-3.5 text-[13px] font-medium text-white backdrop-blur-sm hover:bg-white/20"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Add code
          </button>
        </div>
      </div>
    </header>
  );
}
