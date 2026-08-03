type Props = {
  kind: "quiz" | "milestones" | "filter";
  onAdd?: () => void;
  onClearFilter?: () => void;
};

export function ChallengeEmptyState({ kind, onAdd, onClearFilter }: Props) {
  if (kind === "filter") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-[15px] font-semibold text-slate-900">No matches</p>
        <p className="mt-1 text-[13px] text-slate-500">
          Try another filter or clear search.
        </p>
        {onClearFilter ? (
          <button
            type="button"
            onClick={onClearFilter}
            className="mt-4 h-9 rounded-xl bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    );
  }

  const isQuiz = kind === "quiz";
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <p className="text-[15px] font-semibold text-slate-900">
        {isQuiz ? "Quiz bank empty" : "No milestones"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">
        {isQuiz
          ? "Add questions for the daily rotation."
          : "Add streak gates for the Rewards tab."}
      </p>
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 h-9 rounded-xl bg-orange-600 px-4 text-[13px] font-semibold text-white hover:bg-orange-500"
        >
          {isQuiz ? "Add question" : "Add milestone"}
        </button>
      ) : null}
    </div>
  );
}
