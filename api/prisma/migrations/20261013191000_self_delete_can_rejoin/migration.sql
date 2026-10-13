ALTER TABLE "users" ADD COLUMN "google_banned" BOOLEAN NOT NULL DEFAULT false;

-- Admin "delete data" writes this audit and must keep the Gmail banned.
-- A user's own delete does not, so those rows stay google_banned = false.
UPDATE "users" AS u
SET "google_banned" = true
WHERE u."data_deleted_at" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "audit_logs" AS a
    WHERE a."action" = 'user:delete-data'
      AND a."entity" = 'user:' || u."id"
  );
