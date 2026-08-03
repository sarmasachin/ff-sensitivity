type Props = {
  onAdd?: () => void;
};

export function ShopHeader({ onAdd }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 left-16 h-32 w-32 rounded-full bg-yellow-300/25 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/75 uppercase">
            Catalog
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Shop
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/90">
            Coin shop for Android — packs, boosts, prizes, enable/disable, and
            stock limits. Matches the in-app Coin Shop catalog.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-amber-800 hover:bg-amber-50"
          >
            Add item
          </button>
        </div>
      </div>
    </header>
  );
}
