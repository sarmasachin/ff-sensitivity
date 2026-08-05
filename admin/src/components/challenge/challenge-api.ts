import { apiFetch } from "@/lib/api";
import type {
  ChallengeRules,
  MilestoneRow,
  QuizQuestionRow,
} from "./challenge-data";

// --- Start: Challenge live wire (Sachin) ---
export type ChallengeBundle = {
  rules: ChallengeRules;
  quiz: QuizQuestionRow[];
  milestones: MilestoneRow[];
};

export async function fetchChallengeBundle(): Promise<ChallengeBundle> {
  const data = await apiFetch<ChallengeBundle>("/api/v1/admin/challenge");
  return {
    rules: data.rules,
    quiz: (data.quiz ?? []).map((q) => ({
      ...q,
      options: [
        q.options[0] ?? "",
        q.options[1] ?? "",
        q.options[2] ?? "",
        q.options[3] ?? "",
      ] as [string, string, string, string],
    })),
    milestones: data.milestones ?? [],
  };
}

export async function saveChallengeBundle(
  bundle: ChallengeBundle,
): Promise<ChallengeBundle> {
  const data = await apiFetch<ChallengeBundle>("/api/v1/admin/challenge", {
    method: "PUT",
    body: JSON.stringify(bundle),
  });
  return {
    rules: data.rules,
    quiz: (data.quiz ?? []).map((q) => ({
      ...q,
      options: [
        q.options[0] ?? "",
        q.options[1] ?? "",
        q.options[2] ?? "",
        q.options[3] ?? "",
      ] as [string, string, string, string],
    })),
    milestones: data.milestones ?? [],
  };
}
// --- End: Challenge live wire (Sachin) ---
