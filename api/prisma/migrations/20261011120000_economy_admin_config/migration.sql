-- Economy admin rates: caps and source toggles on the live challenge config row.
ALTER TABLE "challenge_config" ADD COLUMN "wallet_cap" INTEGER NOT NULL DEFAULT 9999999;
ALTER TABLE "challenge_config" ADD COLUMN "daily_earn_cap" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "challenge_config" ADD COLUMN "check_in_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "challenge_config" ADD COLUMN "quiz_enabled" BOOLEAN NOT NULL DEFAULT true;
