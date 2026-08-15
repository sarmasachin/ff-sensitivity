-- Keep the Google seat (email + google_sub) after a staff data wipe
-- so the same Gmail cannot sign in again.
ALTER TABLE "users" ADD COLUMN "data_deleted_at" TIMESTAMP(3);
