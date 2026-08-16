import { ChallengeEmptyState } from "./ChallengeEmptyState";
import { ChallengeMilestoneTable } from "./ChallengeMilestoneTable";
import { ChallengePagination } from "./ChallengePagination";
import { ChallengeQuizTable } from "./ChallengeQuizTable";
import {
  ChallengeToolbar,
  type ChallengeListFilter,
} from "./ChallengeToolbar";
import type { MilestoneRow, QuizQuestionRow } from "./challenge-data";

const PAGE_SIZE = 12;

type Props = {
  tab: "quiz" | "milestones";
  query: string;
  filter: ChallengeListFilter;
  page: number;
  quiz: QuizQuestionRow[];
  quizFiltered: QuizQuestionRow[];
  milestones: MilestoneRow[];
  msFiltered: MilestoneRow[];
  pagedQuiz: QuizQuestionRow[];
  pagedMs: MilestoneRow[];
  onQuery: (q: string) => void;
  onFilter: (f: ChallengeListFilter) => void;
  onPage: (p: number) => void;
  onAddQuiz: () => void;
  onAddMilestone: () => void;
  onEditQuiz: (id: string) => void;
  onEditMilestone: (id: string) => void;
  onToggleQuiz: (id: string) => void;
  onToggleMilestone: (id: string) => void;
  onDeleteQuiz: (id: string) => void;
  onDeleteMilestone: (id: string) => void;
};

export function ChallengeBankSection({
  tab,
  query,
  filter,
  page,
  quiz,
  quizFiltered,
  milestones,
  msFiltered,
  pagedQuiz,
  pagedMs,
  onQuery,
  onFilter,
  onPage,
  onAddQuiz,
  onAddMilestone,
  onEditQuiz,
  onEditMilestone,
  onToggleQuiz,
  onToggleMilestone,
  onDeleteQuiz,
  onDeleteMilestone,
}: Props) {
  return (
    <>
      <ChallengeToolbar
        query={query}
        filter={filter}
        onQuery={onQuery}
        onFilter={onFilter}
        placeholder={
          tab === "quiz"
            ? "Search question or option…"
            : "Search title, day, reward…"
        }
      />
      {tab === "quiz" ? (
        quiz.length === 0 ? (
          <ChallengeEmptyState kind="quiz" onAdd={onAddQuiz} />
        ) : quizFiltered.length === 0 ? (
          <ChallengeEmptyState
            kind="filter"
            onClearFilter={() => {
              onFilter("all");
              onQuery("");
            }}
          />
        ) : (
          <ChallengeQuizTable
            rows={pagedQuiz}
            notice={null}
            onEdit={onEditQuiz}
            onToggle={onToggleQuiz}
            onDelete={onDeleteQuiz}
            footer={
              <ChallengePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={quizFiltered.length}
                onPage={onPage}
              />
            }
          />
        )
      ) : milestones.length === 0 ? (
        <ChallengeEmptyState kind="milestones" onAdd={onAddMilestone} />
      ) : msFiltered.length === 0 ? (
        <ChallengeEmptyState
          kind="filter"
          onClearFilter={() => {
            onFilter("all");
            onQuery("");
          }}
        />
      ) : (
        <ChallengeMilestoneTable
          rows={pagedMs}
          notice={null}
          onEdit={onEditMilestone}
          onToggle={onToggleMilestone}
          onDelete={onDeleteMilestone}
          footer={
            <ChallengePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={msFiltered.length}
              onPage={onPage}
            />
          }
        />
      )}
    </>
  );
}

export { PAGE_SIZE };
