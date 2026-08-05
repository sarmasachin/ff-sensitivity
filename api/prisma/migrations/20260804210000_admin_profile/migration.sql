-- Admin self-profile fields (identity + contact prefs). Login email stays on `email`.
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "job_title" TEXT;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "desk_label" TEXT;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "notify_email" TEXT;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "timezone_label" TEXT;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "digest_daily" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "digest_security" BOOLEAN NOT NULL DEFAULT true;
