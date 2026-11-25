-- Columns present in Prisma schema but never migrated (Ads page Challenge load 500).
ALTER TABLE "challenge_config"
ADD COLUMN IF NOT EXISTS "ad_bonus_cooldown_minutes" INTEGER NOT NULL DEFAULT 240;

ALTER TABLE "challenge_config"
ADD COLUMN IF NOT EXISTS "premium_unlock_best_coins" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "challenge_config"
ADD COLUMN IF NOT EXISTS "premium_unlock_pro_max_coins" INTEGER NOT NULL DEFAULT 200;

ALTER TABLE "challenge_config"
ADD COLUMN IF NOT EXISTS "premium_unlock_one_tap_coins" INTEGER NOT NULL DEFAULT 150;

ALTER TABLE "challenge_config"
ADD COLUMN IF NOT EXISTS "premium_unlock_coin_enabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "challenge_config"
ADD COLUMN IF NOT EXISTS "premium_unlock_ad_enabled" BOOLEAN NOT NULL DEFAULT true;