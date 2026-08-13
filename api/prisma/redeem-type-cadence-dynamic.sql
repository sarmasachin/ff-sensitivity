-- Make redeem Type + Cadence dynamic (like shop categories).
-- Run against local Postgres before/with prisma db push if enum columns still exist.

CREATE TABLE IF NOT EXISTS redeem_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS redeem_types_enabled_sort_order_idx
  ON redeem_types (enabled, sort_order);

CREATE TABLE IF NOT EXISTS redeem_cadences (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  claim_limit INTEGER NOT NULL DEFAULT 3,
  window_hours INTEGER NOT NULL DEFAULT 24,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS redeem_cadences_enabled_sort_order_idx
  ON redeem_cadences (enabled, sort_order);

INSERT INTO redeem_types (id, label, sort_order, enabled, created_at, updated_at)
VALUES
  ('GOOGLE_PLAY', 'Play Gift', 0, TRUE, NOW(), NOW()),
  ('FF_DIAMONDS', 'FF Diamonds', 1, TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO redeem_cadences (id, label, claim_limit, window_hours, sort_order, enabled, created_at, updated_at)
VALUES
  ('DAILY', 'Daily', 3, 24, 0, TRUE, NOW(), NOW()),
  ('WEEKLY', 'Weekly', 2, 168, 1, TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redeem_codes' AND column_name = 'type'
      AND udt_name = 'RedeemType'
  ) THEN
    ALTER TABLE redeem_codes ALTER COLUMN type TYPE TEXT USING type::text;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'redeem_codes' AND column_name = 'cadence'
      AND udt_name = 'RedeemCadence'
  ) THEN
    ALTER TABLE redeem_codes ALTER COLUMN cadence TYPE TEXT USING cadence::text;
    ALTER TABLE redeem_codes ALTER COLUMN cadence SET DEFAULT 'DAILY';
  END IF;
END $$;

DROP TYPE IF EXISTS "RedeemType";
DROP TYPE IF EXISTS "RedeemCadence";
