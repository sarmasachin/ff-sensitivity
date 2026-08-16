type Props = {
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
  onAddQuiz?: () => void;
  onAddMilestone?: () => void;
  tab: "rules" | "quiz" | "milestones";
};

export function ChallengeHeader({
  dirty,
  onSave,
  onReset,
  onAddQuiz,
  onAddMilestone,
  tab,
}: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-orange-300/50 bg-gradient-to-r from-orange-600 via-rose-500 to-fuchsia-600 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-white/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-amber-300/25 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/75 uppercase">
            Retention
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Challenge
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/90">
            Daily check-in, quiz bank, and streak milestones — live on Nest.
            Android loads GET /api/v1/challenge/today.
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
          {tab === "quiz" ? (
            <button
              type="button"
              onClick={onAddQuiz}
              className="h-10 rounded-xl border border-white/30 bg-white/10 px-3.5 text-[13px] font-medium text-white hover:bg-white/20"
            >
              Add question
            </button>
          ) : null}
          {tab === "milestones" ? (
            <button
              type="button"
              onClick={onAddMilestone}
              className="h-10 rounded-xl border border-white/30 bg-white/10 px-3.5 text-[13px] font-medium text-white hover:bg-white/20"
            >
              Add milestone
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty}
            className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-orange-800 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save draft
          </button>
        </div>
      </div>
    </header>
  );
}
