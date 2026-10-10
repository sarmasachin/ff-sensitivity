-- App profile fields saved from the drawer and shown in admin.
ALTER TABLE "users" ADD COLUMN "google_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "ff_uid" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "play_role" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "region" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "notify_push" BOOLEAN NOT NULL DEFAULT true;
