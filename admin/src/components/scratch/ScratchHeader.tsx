export function ScratchHeader() {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-fuchsia-200/70 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 left-16 h-32 w-32 rounded-full bg-violet-300/25 blur-2xl"
      />

      <div className="relative min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-white/75 uppercase">
          Reveal
        </p>
        <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
          Scratch
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/90">
          Prize tables, gift odds, streak-bonus cards, and history policy for
          the Android Scratch Cards experience.
        </p>
      </div>
    </header>
  );
}
