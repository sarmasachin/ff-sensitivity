-- Added to Prisma schema/seed after the original challenge_config table,
-- but never shipped as a migration. Production `migrate deploy` therefore
-- never created them. Ads admin then GETs /admin/challenge and Prisma
-- selects these columns → 500 "Something went wrong."
ALTER TABLE "challenge_config"
ADD COLUMN IF NOT EXISTS "ad_bonus_cooldown_hours" INTEGER NOT NULL DEFAULT 4;

ALTER TABLE "challenge_config"
ADD COLUMN IF NOT EXISTS "wrong_answer_lock_minutes" INTEGER NOT NULL DEFAULT 20;
