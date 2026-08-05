type Props = {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onReset: () => void;
};

export function ScratchHeader({ dirty, saving, onSave, onReset }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-fuchsia-200/70 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/75 uppercase">
            Reveal
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Scratch
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/90">
            Live Nest prize tables, gift odds, and history policy for Android
            daily scratch rolls.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={saving}
            className="rounded-xl border border-white/30 bg-white/10 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className="rounded-xl bg-white px-3.5 py-2 text-[12px] font-bold text-fuchsia-700 shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : dirty ? "Save live" : "Saved"}
          </button>
        </div>
      </div>
    </header>
  );
}
