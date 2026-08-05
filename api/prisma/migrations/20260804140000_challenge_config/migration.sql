-- Challenge live wire: admin-editable rules, quiz bank, milestones

CREATE TABLE "challenge_config" (
    "id" TEXT NOT NULL,
    "miss_day_resets_streak" BOOLEAN NOT NULL DEFAULT true,
    "require_check_in" BOOLEAN NOT NULL DEFAULT true,
    "require_quiz" BOOLEAN NOT NULL DEFAULT true,
    "ad_bonus_optional" BOOLEAN NOT NULL DEFAULT true,
    "scratch_cards_per_day" INTEGER NOT NULL DEFAULT 1,
    "card_expires_same_day" BOOLEAN NOT NULL DEFAULT true,
    "first_milestone_days" INTEGER NOT NULL DEFAULT 7,
    "wrong_answer_lock_hours" INTEGER NOT NULL DEFAULT 4,
    "quiz_open_window_hours" INTEGER NOT NULL DEFAULT 2,
    "quiz_correct_coins" INTEGER NOT NULL DEFAULT 50,
    "quiz_wrong_coins" INTEGER NOT NULL DEFAULT -10,
    "checkin_coins" INTEGER NOT NULL DEFAULT 20,
    "ad_bonus_coins" INTEGER NOT NULL DEFAULT 30,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "challenge_quiz_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "option_0" TEXT NOT NULL,
    "option_1" TEXT NOT NULL,
    "option_2" TEXT NOT NULL,
    "option_3" TEXT NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_quiz_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "challenge_quiz_questions_enabled_sort_order_idx" ON "challenge_quiz_questions"("enabled", "sort_order");

CREATE TABLE "challenge_milestones" (
    "id" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "reward_label" TEXT NOT NULL,
    "coin_reward" INTEGER NOT NULL,
    "badge" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_milestones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "challenge_milestones_days_key" ON "challenge_milestones"("days");
CREATE INDEX "challenge_milestones_enabled_days_idx" ON "challenge_milestones"("enabled", "days");
