-- ProMax admin config on app_config (schema had promaxJson; column was never migrated).
ALTER TABLE "app_config"
ADD COLUMN IF NOT EXISTS "promax_json" JSONB NOT NULL DEFAULT '{}';