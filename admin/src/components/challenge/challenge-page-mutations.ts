import {
  createMilestone,
  createQuizQuestion,
  deleteMilestone,
  deleteQuizQuestion,
  updateMilestone,
  updateQuizQuestion,
} from "./challenge-api";
import {
  formToMilestone,
  formToQuiz,
  type MilestoneFormValues,
  type MilestoneRow,
  type QuizFormValues,
  type QuizQuestionRow,
} from "./challenge-data";
import { CHALLENGE_TOAST_TITLES } from "./challenge-toast";
import type { RedeemToastTone } from "@/components/redeem/redeem-toast";

type Push = (
  tone: RedeemToastTone,
  title: string,
  message: string,
) => void;

export async function persistQuiz(
  values: QuizFormValues,
  mode: "add" | "edit",
  quiz: QuizQuestionRow[],
  editingId: string | null,
  setQuiz: (fn: (prev: QuizQuestionRow[]) => QuizQuestionRow[]) => void,
  push: Push,
): Promise<string | null> {
  if (mode === "add") {
    if (quiz.length >= 1500) return "Quiz bank is full (max 1500 questions).";
    const id = values.id.trim() || `q_${Date.now()}`;
    if (quiz.some((r) => r.id === id)) return "Question ID already exists.";
    const result = formToQuiz(values, id);
    if ("error" in result) return result.error;
    try {
      const saved = await createQuizQuestion(result);
      setQuiz((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
      push("success", CHALLENGE_TOAST_TITLES.added, `Question ${saved.id} is live.`);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to save question.";
    }
  }
  if (!editingId) return "Nothing to edit.";
  const result = formToQuiz({ ...values, id: editingId }, editingId);
  if ("error" in result) return result.error;
  try {
    const saved = await updateQuizQuestion(editingId, result);
    setQuiz((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    push("success", CHALLENGE_TOAST_TITLES.updated, `Question ${saved.id} updated.`);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Failed to update question.";
  }
}

export async function persistMilestone(
  values: MilestoneFormValues,
  mode: "add" | "edit",
  milestones: MilestoneRow[],
  editingId: string | null,
  setMilestones: (fn: (prev: MilestoneRow[]) => MilestoneRow[]) => void,
  push: Push,
): Promise<string | null> {
  if (mode === "add") {
    const id = values.id.trim() || `m_${values.days || Date.now()}`;
    if (milestones.some((r) => r.id === id)) return "Milestone ID already exists.";
    const days = Number(values.days);
    if (milestones.some((r) => r.days === days)) {
      return "A milestone for this day already exists.";
    }
    const result = formToMilestone(values, id);
    if ("error" in result) return result.error;
    try {
      const saved = await createMilestone(result);
      setMilestones((prev) =>
        [...prev.filter((r) => r.id !== saved.id), saved].sort(
          (a, b) => a.days - b.days,
        ),
      );
      push("success", CHALLENGE_TOAST_TITLES.added, `Day ${saved.days} milestone is live.`);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to save milestone.";
    }
  }
  if (!editingId) return "Nothing to edit.";
  const result = formToMilestone({ ...values, id: editingId }, editingId);
  if ("error" in result) return result.error;
  if (milestones.some((r) => r.id !== editingId && r.days === result.days)) {
    return "A milestone for this day already exists.";
  }
  try {
    const saved = await updateMilestone(editingId, result);
    setMilestones((prev) =>
      prev
        .map((r) => (r.id === saved.id ? saved : r))
        .sort((a, b) => a.days - b.days),
    );
    push("success", CHALLENGE_TOAST_TITLES.updated, `Day ${saved.days} milestone updated.`);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Failed to update milestone.";
  }
}

export async function toggleQuizRow(
  id: string,
  quiz: QuizQuestionRow[],
  setQuiz: (fn: (prev: QuizQuestionRow[]) => QuizQuestionRow[]) => void,
  push: Push,
) {
  const row = quiz.find((r) => r.id === id);
  if (!row) return;
  try {
    const saved = await updateQuizQuestion(id, { ...row, enabled: !row.enabled });
    setQuiz((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    push(
      "success",
      CHALLENGE_TOAST_TITLES.updated,
      `Question ${saved.id} ${saved.enabled ? "live" : "off"}.`,
    );
  } catch (e) {
    push(
      "error",
      CHALLENGE_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to update question.",
    );
  }
}

export async function deleteQuizRow(
  id: string,
  quiz: QuizQuestionRow[],
  setQuiz: (fn: (prev: QuizQuestionRow[]) => QuizQuestionRow[]) => void,
  push: Push,
) {
  const row = quiz.find((r) => r.id === id);
  if (!row) return;
  if (!window.confirm(`Delete question “${row.id}”?`)) return;
  try {
    await deleteQuizQuestion(id);
    setQuiz((prev) => prev.filter((r) => r.id !== id));
    push("success", CHALLENGE_TOAST_TITLES.deleted, `Deleted ${row.id}.`);
  } catch (e) {
    push(
      "error",
      CHALLENGE_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to delete question.",
    );
  }
}

export async function toggleMilestoneRow(
  id: string,
  milestones: MilestoneRow[],
  setMilestones: (fn: (prev: MilestoneRow[]) => MilestoneRow[]) => void,
  push: Push,
) {
  const row = milestones.find((r) => r.id === id);
  if (!row) return;
  try {
    const saved = await updateMilestone(id, { ...row, enabled: !row.enabled });
    setMilestones((prev) =>
      prev
        .map((r) => (r.id === saved.id ? saved : r))
        .sort((a, b) => a.days - b.days),
    );
    push(
      "success",
      CHALLENGE_TOAST_TITLES.updated,
      `Day ${saved.days} ${saved.enabled ? "live" : "off"}.`,
    );
  } catch (e) {
    push(
      "error",
      CHALLENGE_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to update milestone.",
    );
  }
}

export async function deleteMilestoneRow(
  id: string,
  milestones: MilestoneRow[],
  setMilestones: (fn: (prev: MilestoneRow[]) => MilestoneRow[]) => void,
  push: Push,
) {
  const row = milestones.find((r) => r.id === id);
  if (!row) return;
  if (!window.confirm(`Delete milestone Day ${row.days} (“${row.title}”)?`)) {
    return;
  }
  try {
    await deleteMilestone(id);
    setMilestones((prev) => prev.filter((r) => r.id !== id));
    push("success", CHALLENGE_TOAST_TITLES.deleted, `Deleted Day ${row.days}.`);
  } catch (e) {
    push(
      "error",
      CHALLENGE_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to delete milestone.",
    );
  }
}
