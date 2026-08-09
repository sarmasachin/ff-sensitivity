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

/** Android dailyQuizBank sample. */
export const QUIZ_DEMO_ROWS: QuizQuestionRow[] = [
  {
    id: "q1",
    question: "Approx Free Fire nickname character limit is?",
    options: ["6", "12", "20", "30"],
    correctIndex: 1,
    enabled: true,
  },
  {
    id: "q2",
    question: "Which setting mainly affects aim drag feel?",
    options: ["DPI only", "Sensitivity", "Brightness", "Volume"],
    correctIndex: 1,
    enabled: true,
  },
  {
    id: "q3",
    question: "Higher refresh rate usually means?",
    options: ["Smoother motion", "More storage", "Better battery always", "Lower RAM"],
    correctIndex: 0,
    enabled: true,
  },
  {
    id: "q4",
    question: "Safe DPI tip helps avoid?",
    options: ["Friend requests", "Crash / black screen risk", "Name change", "Clan join"],
    correctIndex: 1,
    enabled: true,
  },
  {
    id: "q5",
    question: "Red Dot sensitivity is usually set?",
    options: [
      "Far above General",
      "Near / slightly under General",
      "Always 0",
      "Only for snipers",
    ],
    correctIndex: 1,
    enabled: true,
  },
  {
    id: "q6",
    question: "HUD fire button size depends most on?",
    options: ["Wallpaper", "Screen size + fingers", "Clan level", "Server ping only"],
    correctIndex: 1,
    enabled: true,
  },
  {
    id: "q7",
    question: "Best practice before sharing sensi?",
    options: ["Hide device info", "Test in training", "Set everything to 200", "Disable touch"],
    correctIndex: 1,
    enabled: true,
  },
];

/** Android streakMilestones (enabled by default). */
export const MILESTONE_DEMO_ROWS: MilestoneRow[] = [
  { id: "m7", days: 7, title: "Week Warrior", rewardLabel: "+50 coins · Scratch", coinReward: 50, badge: null, enabled: true },
  { id: "m15", days: 15, title: "Rising Pro", rewardLabel: "+75 coins · Scratch", coinReward: 75, badge: null, enabled: true },
  { id: "m20", days: 20, title: "Solid Start", rewardLabel: "+100 coins · Scratch", coinReward: 100, badge: null, enabled: true },
  { id: "m30", days: 30, title: "Monthly Elite", rewardLabel: "+150 coins · Badge · Scratch", coinReward: 150, badge: "Monthly Elite", enabled: true },
  { id: "m45", days: 45, title: "Focus Fire", rewardLabel: "+200 coins · Scratch", coinReward: 200, badge: null, enabled: true },
  { id: "m60", days: 60, title: "Two Month Ace", rewardLabel: "+250 coins · Scratch", coinReward: 250, badge: null, enabled: true },
  { id: "m75", days: 75, title: "Sharp Shooter", rewardLabel: "+300 coins · Scratch", coinReward: 300, badge: null, enabled: true },
  { id: "m90", days: 90, title: "Quarter Legend", rewardLabel: "+400 coins · Badge · Scratch", coinReward: 400, badge: "Quarter Legend", enabled: true },
  { id: "m100", days: 100, title: "Century Club", rewardLabel: "+500 coins · Scratch", coinReward: 500, badge: null, enabled: true },
  { id: "m120", days: 120, title: "Iron Streak", rewardLabel: "+600 coins · Scratch", coinReward: 600, badge: null, enabled: true },
  { id: "m150", days: 150, title: "Half-Year Heat", rewardLabel: "+750 coins · Scratch", coinReward: 750, badge: null, enabled: true },
  { id: "m180", days: 180, title: "Season Master", rewardLabel: "+1000 coins · Badge · Scratch", coinReward: 1000, badge: "Season Master", enabled: true },
  { id: "m200", days: 200, title: "200 Club", rewardLabel: "+1200 coins · Scratch", coinReward: 1200, badge: null, enabled: true },
  { id: "m240", days: 240, title: "Unbroken", rewardLabel: "+1500 coins · Scratch", coinReward: 1500, badge: null, enabled: true },
  { id: "m260", days: 260, title: "Hardcore", rewardLabel: "+1700 coins · Scratch", coinReward: 1700, badge: null, enabled: true },
  { id: "m290", days: 290, title: "Near Immortal", rewardLabel: "+2000 coins · Scratch", coinReward: 2000, badge: null, enabled: true },
  { id: "m300", days: 300, title: "300 Crown", rewardLabel: "+2200 coins · Badge · Scratch", coinReward: 2200, badge: "300 Crown", enabled: true },
  { id: "m350", days: 350, title: "Final Push", rewardLabel: "+2500 coins · Scratch", coinReward: 2500, badge: null, enabled: true },
  { id: "m360", days: 360, title: "Almost Eternal", rewardLabel: "+2800 coins · Scratch", coinReward: 2800, badge: null, enabled: true },
  { id: "m365", days: 365, title: "Year Legend", rewardLabel: "+5000 coins · Legend · Scratch", coinReward: 5000, badge: "Year Legend", enabled: true },
];

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
    body: "Remote question pool — up to 1500 questions; one new question / UTC day (full-bank rotate).",
  },
  {
    title: "Streak milestones",
    body: "Day gates, coin payouts, badges — Rewards tab on Android.",
  },
  {
    title: "Live Nest sync",
    body: "Save pushes rules + quiz + milestones to Nest. Android loads GET /api/v1/challenge/today.",
  },
] as const;
