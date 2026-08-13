-- Safe Type B scratch-reward schema (run on VPS Postgres if needed).
-- Prefer: npx prisma db push from api/

ALTER TABLE redeem_codes
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'SINGLE',
  ADD COLUMN IF NOT EXISTS coin_reward_min INT,
  ADD COLUMN IF NOT EXISTS coin_reward_max INT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_minutes INT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS codes_per_window INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS redeem_codes_mode_status_idx ON redeem_codes (mode, status);

CREATE TABLE IF NOT EXISTS redeem_code_secrets (
  id TEXT PRIMARY KEY,
  redeem_code_id TEXT NOT NULL REFERENCES redeem_codes(id) ON DELETE CASCADE,
  code_secret TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'UNUSED',
  assigned_user_id TEXT,
  assigned_at TIMESTAMPTZ,
  award_window INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS redeem_code_secrets_card_status_idx
  ON redeem_code_secrets (redeem_code_id, status);
CREATE INDEX IF NOT EXISTS redeem_code_secrets_card_window_idx
  ON redeem_code_secrets (redeem_code_id, award_window);

CREATE TABLE IF NOT EXISTS redeem_scratch_rolls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeem_code_id TEXT NOT NULL REFERENCES redeem_codes(id) ON DELETE CASCADE,
  attempt_key TEXT NOT NULL,
  coins_granted INT NOT NULL,
  code_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, redeem_code_id, attempt_key)
);
CREATE INDEX IF NOT EXISTS redeem_scratch_rolls_card_created_idx
  ON redeem_scratch_rolls (redeem_code_id, created_at);
CREATE INDEX IF NOT EXISTS redeem_scratch_rolls_user_card_idx
  ON redeem_scratch_rolls (user_id, redeem_code_id);

CREATE TABLE IF NOT EXISTS redeem_scratch_passes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeem_code_id TEXT NOT NULL REFERENCES redeem_codes(id) ON DELETE CASCADE,
  allowed_attempts INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, redeem_code_id)
);
