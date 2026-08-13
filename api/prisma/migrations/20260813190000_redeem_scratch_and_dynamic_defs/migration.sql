-- Redeem Type B scratch reward + dynamic type/cadence (TEXT ids).

-- RedeemMode enum
DO $$ BEGIN
  CREATE TYPE "RedeemMode" AS ENUM ('SINGLE', 'SCRATCH_REWARD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RedeemSecretStatus" AS ENUM ('UNUSED', 'ASSIGNED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "redeem_types" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "redeem_types_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "redeem_types_enabled_sort_order_idx"
  ON "redeem_types"("enabled", "sort_order");

CREATE TABLE IF NOT EXISTS "redeem_cadences" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "claim_limit" INTEGER NOT NULL DEFAULT 3,
    "window_hours" INTEGER NOT NULL DEFAULT 24,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "redeem_cadences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "redeem_cadences_enabled_sort_order_idx"
  ON "redeem_cadences"("enabled", "sort_order");

INSERT INTO "redeem_types" ("id", "label", "sort_order", "enabled", "created_at", "updated_at")
VALUES
  ('GOOGLE_PLAY', 'Play Gift', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('FF_DIAMONDS', 'FF Diamonds', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "redeem_cadences" ("id", "label", "claim_limit", "window_hours", "sort_order", "enabled", "created_at", "updated_at")
VALUES
  ('DAILY', 'Daily', 3, 24, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('WEEKLY', 'Weekly', 2, 168, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Convert enum type/cadence columns to TEXT if still enums
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redeem_codes' AND column_name = 'type'
      AND udt_name = 'RedeemType'
  ) THEN
    ALTER TABLE "redeem_codes" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redeem_codes' AND column_name = 'cadence'
      AND udt_name = 'RedeemCadence'
  ) THEN
    ALTER TABLE "redeem_codes" ALTER COLUMN "cadence" TYPE TEXT USING "cadence"::text;
    ALTER TABLE "redeem_codes" ALTER COLUMN "cadence" SET DEFAULT 'DAILY';
  END IF;
END $$;

DROP TYPE IF EXISTS "RedeemType";
DROP TYPE IF EXISTS "RedeemCadence";

-- Scratch reward columns on redeem_codes
ALTER TABLE "redeem_codes" ADD COLUMN IF NOT EXISTS "mode" "RedeemMode" NOT NULL DEFAULT 'SINGLE';
ALTER TABLE "redeem_codes" ADD COLUMN IF NOT EXISTS "coin_reward_min" INTEGER;
ALTER TABLE "redeem_codes" ADD COLUMN IF NOT EXISTS "coin_reward_max" INTEGER;
ALTER TABLE "redeem_codes" ADD COLUMN IF NOT EXISTS "starts_at" TIMESTAMP(3);
ALTER TABLE "redeem_codes" ADD COLUMN IF NOT EXISTS "ends_at" TIMESTAMP(3);
ALTER TABLE "redeem_codes" ADD COLUMN IF NOT EXISTS "window_minutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "redeem_codes" ADD COLUMN IF NOT EXISTS "codes_per_window" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "redeem_codes_mode_status_idx"
  ON "redeem_codes"("mode", "status");

CREATE TABLE IF NOT EXISTS "redeem_code_secrets" (
    "id" TEXT NOT NULL,
    "redeem_code_id" TEXT NOT NULL,
    "code_secret" TEXT NOT NULL,
    "status" "RedeemSecretStatus" NOT NULL DEFAULT 'UNUSED',
    "assigned_user_id" TEXT,
    "assigned_at" TIMESTAMP(3),
    "award_window" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "redeem_code_secrets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "redeem_code_secrets_code_secret_key"
  ON "redeem_code_secrets"("code_secret");
CREATE INDEX IF NOT EXISTS "redeem_code_secrets_redeem_code_id_status_idx"
  ON "redeem_code_secrets"("redeem_code_id", "status");
CREATE INDEX IF NOT EXISTS "redeem_code_secrets_redeem_code_id_award_window_idx"
  ON "redeem_code_secrets"("redeem_code_id", "award_window");

DO $$ BEGIN
  ALTER TABLE "redeem_code_secrets"
    ADD CONSTRAINT "redeem_code_secrets_redeem_code_id_fkey"
    FOREIGN KEY ("redeem_code_id") REFERENCES "redeem_codes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "redeem_scratch_rolls" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "redeem_code_id" TEXT NOT NULL,
    "attempt_key" TEXT NOT NULL,
    "coins_granted" INTEGER NOT NULL,
    "code_secret" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "redeem_scratch_rolls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "redeem_scratch_rolls_user_id_redeem_code_id_attempt_key_key"
  ON "redeem_scratch_rolls"("user_id", "redeem_code_id", "attempt_key");
CREATE INDEX IF NOT EXISTS "redeem_scratch_rolls_redeem_code_id_created_at_idx"
  ON "redeem_scratch_rolls"("redeem_code_id", "created_at");
CREATE INDEX IF NOT EXISTS "redeem_scratch_rolls_user_id_redeem_code_id_idx"
  ON "redeem_scratch_rolls"("user_id", "redeem_code_id");

DO $$ BEGIN
  ALTER TABLE "redeem_scratch_rolls"
    ADD CONSTRAINT "redeem_scratch_rolls_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "redeem_scratch_rolls"
    ADD CONSTRAINT "redeem_scratch_rolls_redeem_code_id_fkey"
    FOREIGN KEY ("redeem_code_id") REFERENCES "redeem_codes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "redeem_scratch_passes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "redeem_code_id" TEXT NOT NULL,
    "allowed_attempts" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "redeem_scratch_passes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "redeem_scratch_passes_user_id_redeem_code_id_key"
  ON "redeem_scratch_passes"("user_id", "redeem_code_id");

DO $$ BEGIN
  ALTER TABLE "redeem_scratch_passes"
    ADD CONSTRAINT "redeem_scratch_passes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "redeem_scratch_passes"
    ADD CONSTRAINT "redeem_scratch_passes_redeem_code_id_fkey"
    FOREIGN KEY ("redeem_code_id") REFERENCES "redeem_codes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
