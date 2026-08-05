-- Scratch live wire: config, prize table, daily rolls + AdminModule.scratch

-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE IF NOT EXISTS 'scratch';

CREATE TABLE "scratch_config" (
    "id" TEXT NOT NULL,
    "coins_percent" INTEGER NOT NULL DEFAULT 55,
    "redeem_percent" INTEGER NOT NULL DEFAULT 45,
    "coin_amount" INTEGER NOT NULL DEFAULT 50,
    "retention_days" INTEGER NOT NULL DEFAULT 30,
    "auto_purge" BOOLEAN NOT NULL DEFAULT true,
    "show_expired" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scratch_config_pkey" PRIMARY KEY ("id")
);

CREATE TYPE "ScratchPrizeKind" AS ENUM ('MILESTONE', 'REDEEM', 'SHOP', 'GIFT');
CREATE TYPE "ScratchRollOutcome" AS ENUM ('COINS', 'REDEEM');

CREATE TABLE "scratch_prizes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "kind" "ScratchPrizeKind" NOT NULL,
    "reward_label" TEXT NOT NULL,
    "coin_reward" INTEGER NOT NULL DEFAULT 0,
    "odds_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "streak_days" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scratch_prizes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scratch_prizes_enabled_kind_idx" ON "scratch_prizes"("enabled", "kind");

CREATE TABLE "scratch_rolls" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_key" TEXT NOT NULL,
    "slot" INTEGER NOT NULL DEFAULT 0,
    "outcome" "ScratchRollOutcome" NOT NULL,
    "prize_id" TEXT,
    "coin_delta" INTEGER NOT NULL DEFAULT 0,
    "redeem_code_id" TEXT,
    "title" TEXT NOT NULL,
    "reward_label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scratch_rolls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scratch_rolls_user_id_day_key_slot_key" ON "scratch_rolls"("user_id", "day_key", "slot");
CREATE INDEX "scratch_rolls_user_id_created_at_idx" ON "scratch_rolls"("user_id", "created_at");

ALTER TABLE "scratch_rolls" ADD CONSTRAINT "scratch_rolls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
