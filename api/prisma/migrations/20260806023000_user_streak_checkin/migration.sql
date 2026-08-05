-- Economy fields on users (were in schema.prisma but never migrated).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streak_days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_checkin_day" TEXT;
