/** Daily Challenge admin — matches Android DailyChallengeStore / quiz / milestones. */

export type ChallengeTabId = "rules" | "quiz" | "milestones";

export type ChallengeRules = {
  missDayResetsStreak: boolean;
  requireCheckIn: boolean;
  requireQuiz: boolean;
  adBonusOptional: boolean;
  /** Hours before another Watch Ad Bonus claim (admin-controlled). */
  adBonusCooldownHours: number;
  scratchCardsPerDay: number;
  cardExpiresSameDay: boolean;
  firstMilestoneDays: number;
  wrongAnswerLockHours: number;
  /** Minutes after wrong before Watch Ad unlocks a new question (default 20). */
  wrongAnswerLockMinutes: number;
  /** Kept for API compat — same-question open window no longer used. */
  quizOpenWindowHours: number;
  /** Coins on correct quiz answer (≥ 0). */
  quizCorrectCoins: number;
  /**
   * Coins on wrong quiz answer. Negative = penalty (balance can go below 0,
   * e.g. 0 → -10 when set to -10).
   */
  quizWrongCoins: number;
};

export type QuizQuestionRow = {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  enabled: boolean;
};

export type QuizFormValues = {
  id: string;
  question: string;
  option0: string;
  option1: string;
  option2: string;
  option3: string;
  correctIndex: string;
  enabled: boolean;
};

export type MilestoneRow = {
  id: string;
  days: number;
  title: string;
  rewardLabel: string;
  coinReward: number;
  badge: string | null;
  enabled: boolean;
};

export type MilestoneFormValues = {
  id: string;
  days: string;
  title: string;
  rewardLabel: string;
  coinReward: string;
  badge: string;
  enabled: boolean;
};

export const CHALLENGE_DEFAULT_RULES: ChallengeRules = {
  missDayResetsStreak: true,
  requireCheckIn: true,
  requireQuiz: true,
  adBonusOptional: true,
  adBonusCooldownHours: 4,
  scratchCardsPerDay: 1,
  cardExpiresSameDay: true,
  firstMilestoneDays: 7,
  wrongAnswerLockHours: 4,
  wrongAnswerLockMinutes: 20,
  quizOpenWindowHours: 2,
  quizCorrectCoins: 50,
  quizWrongCoins: -10,
};

export function emptyQuizForm(): QuizFormValues {
  return {
    id: "",
    question: "",
    option0: "",
    option1: "",
    option2: "",
    option3: "",
    correctIndex: "0",
    enabled: true,
  };
}

export function quizToForm(row: QuizQuestionRow): QuizFormValues {
  return {
    id: row.id,
    question: row.question,
    option0: row.options[0],
    option1: row.options[1],
    option2: row.options[2],
    option3: row.options[3],
    correctIndex: String(row.correctIndex),
    enabled: row.enabled,
  };
}

export function formToQuiz(
  values: QuizFormValues,
  fallbackId: string,
): QuizQuestionRow | { error: string } {
  const question = values.question.trim();
  const options: [string, string, string, string] = [
    values.option0.trim(),
    values.option1.trim(),
    values.option2.trim(),
    values.option3.trim(),
  ];
  if (!question) return { error: "Question is required." };
  if (options.some((o) => !o)) return { error: "All 4 options are required." };
  const correctIndex = Number(values.correctIndex);
  if (![0, 1, 2, 3].includes(correctIndex)) {
    return { error: "Correct answer must be option 1–4." };
  }
  const id =
    values.id.trim().toLowerCase().replace(/\s+/g, "_") || fallbackId;
  return { id, question, options, correctIndex, enabled: values.enabled };
}

export function emptyMilestoneForm(): MilestoneFormValues {
  return {
    id: "",
    days: "7",
    title: "",
    rewardLabel: "",
    coinReward: "50",
    badge: "",
    enabled: true,
  };
}

export function milestoneToForm(row: MilestoneRow): MilestoneFormValues {
  return {
    id: row.id,
    days: String(row.days),
    title: row.title,
    rewardLabel: row.rewardLabel,
    coinReward: String(row.coinReward),
    badge: row.badge ?? "",
    enabled: row.enabled,
  };
}

export function formToMilestone(
  values: MilestoneFormValues,
  fallbackId: string,
): MilestoneRow | { error: string } {
  const title = values.title.trim();
  const rewardLabel = values.rewardLabel.trim();
  const days = Number(values.days);
  const coinReward = Number(values.coinReward);
  if (!title) return { error: "Title is required." };
  if (!rewardLabel) return { error: "Reward label is required." };
  if (!Number.isInteger(days) || days < 1) {
    return { error: "Days must be a whole number ≥ 1." };
  }
  if (!Number.isInteger(coinReward) || coinReward < 0) {
    return { error: "Coin reward must be a whole number ≥ 0." };
  }
  const badgeRaw = values.badge.trim();
  const id =
    values.id.trim().toLowerCase().replace(/\s+/g, "_") || fallbackId;
  return {
    id,
    days,
    title,
    rewardLabel,
    coinReward,
    badge: badgeRaw || null,
    enabled: values.enabled,
  };
}

export function computeChallengeStats(
  quiz: QuizQuestionRow[],
  milestones: MilestoneRow[],
  rules: ChallengeRules,
) {
  return {
    quizLive: quiz.filter((q) => q.enabled).length,
    milestonesLive: milestones.filter((m) => m.enabled).length,
    firstGate: rules.firstMilestoneDays,
    tasks: [rules.requireCheckIn, rules.requireQuiz, rules.adBonusOptional].filter(
      Boolean,
    ).length,
  };
}

export const CHALLENGE_CAPABILITIES = [
  {
    title: "Daily task rules",
    body: "Toggle check-in, quiz, optional ad bonus, and miss-day streak reset.",
  },
  {
    title: "Wrong-answer lock",
    body: "After a wrong answer, quiz button shows a countdown — opens again after admin-set hours.",
  },
  {
    title: "Open window",
    body: "Once unlocked, question stays answerable only for the open-window hours, then turns off.",
  },
  {
    title: "Quiz coins",
    body: "Admin sets correct / wrong coin deltas. Wrong can be negative — balance may go below 0 (e.g. 0 → -10).",
  },
  {
    title: "Quiz bank",
    body: "Questions save immediately to Nest. Android rotates one live question per UTC day.",
  },
  {
    title: "Streak milestones",
    body: "Day gates, coin payouts, badges — Rewards tab on Android.",
  },
  {
    title: "Live Nest sync",
    body: "Save draft writes rules only. Quiz and milestones persist on add/edit/delete.",
  },
] as const;
