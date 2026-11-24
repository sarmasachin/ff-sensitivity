-- AlterTable: refresh Hz for Pro Max peer matching
ALTER TABLE "sensitivity_compares" ADD COLUMN "refresh_hz" INTEGER,
ADD COLUMN "refresh_bucket" INTEGER;

CREATE INDEX "sensitivity_compares_refresh_bucket_fingers_role_idx"
  ON "sensitivity_compares"("refresh_bucket", "fingers", "role");
