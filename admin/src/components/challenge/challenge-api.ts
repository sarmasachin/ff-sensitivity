import { apiFetch } from "@/lib/api";
import type {
  ChallengeRules,
  MilestoneRow,
  QuizQuestionRow,
} from "./challenge-data";
import { CHALLENGE_DEFAULT_RULES } from "./challenge-data";

// --- Start: Challenge live wire (Sachin) ---
export type ChallengeBundle = {
  rules: ChallengeRules;
  quiz: QuizQuestionRow[];
  milestones: MilestoneRow[];
};

function normalizeRules(
  rules: Partial<ChallengeRules> | null | undefined,
): ChallengeRules {
  return { ...CHALLENGE_DEFAULT_RULES, ...(rules ?? {}) };
}

function normalizeQuiz(quiz: QuizQuestionRow[] | undefined): QuizQuestionRow[] {
  return (quiz ?? []).map((q) => ({
    ...q,
    options: [
      q.options[0] ?? "",
      q.options[1] ?? "",
      q.options[2] ?? "",
      q.options[3] ?? "",
    ] as [string, string, string, string],
  }));
}

function normalizeQuestion(q: QuizQuestionRow): QuizQuestionRow {
  return normalizeQuiz([q])[0];
}

export async function fetchChallengeBundle(): Promise<ChallengeBundle> {
  const data = await apiFetch<ChallengeBundle>("/api/v1/admin/challenge");
  return {
    rules: normalizeRules(data.rules),
    quiz: normalizeQuiz(data.quiz),
    milestones: data.milestones ?? [],
  };
}

export async function saveChallengeBundle(bundle: {
  rules: ChallengeRules;
  quiz?: QuizQuestionRow[];
  milestones?: MilestoneRow[];
}): Promise<ChallengeBundle> {
  const body: {
    rules: ChallengeRules;
    quiz?: QuizQuestionRow[];
    milestones?: MilestoneRow[];
  } = {
    rules: normalizeRules(bundle.rules),
  };
  if (bundle.quiz !== undefined) body.quiz = bundle.quiz;
  if (bundle.milestones !== undefined) body.milestones = bundle.milestones;
  const data = await apiFetch<ChallengeBundle>("/api/v1/admin/challenge", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return {
    rules: normalizeRules(data.rules),
    quiz: normalizeQuiz(data.quiz),
    milestones: data.milestones ?? [],
  };
}

export async function createQuizQuestion(
  row: QuizQuestionRow,
): Promise<QuizQuestionRow> {
  const data = await apiFetch<QuizQuestionRow>("/api/v1/admin/challenge/quiz", {
    method: "POST",
    body: JSON.stringify(row),
  });
  return normalizeQuestion(data);
}

export async function updateQuizQuestion(
  id: string,
  row: QuizQuestionRow,
): Promise<QuizQuestionRow> {
  const data = await apiFetch<QuizQuestionRow>(
    `/api/v1/admin/challenge/quiz/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ ...row, id }),
    },
  );
  return normalizeQuestion(data);
}

export async function deleteQuizQuestion(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/challenge/quiz/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function createMilestone(
  row: MilestoneRow,
): Promise<MilestoneRow> {
  return apiFetch<MilestoneRow>("/api/v1/admin/challenge/milestones", {
    method: "POST",
    body: JSON.stringify(row),
  });
}

export async function updateMilestone(
  id: string,
  row: MilestoneRow,
): Promise<MilestoneRow> {
  return apiFetch<MilestoneRow>(
    `/api/v1/admin/challenge/milestones/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ ...row, id }),
    },
  );
}

export async function deleteMilestone(id: string): Promise<void> {
  await apiFetch(
    `/api/v1/admin/challenge/milestones/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
// --- End: Challenge live wire (Sachin) ---
