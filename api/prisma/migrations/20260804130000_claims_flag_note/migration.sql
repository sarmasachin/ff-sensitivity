-- AlterTable
ALTER TABLE "redeem_claims" ADD COLUMN "flagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "redeem_claims" ADD COLUMN "admin_note" TEXT;

-- CreateIndex
CREATE INDEX "redeem_claims_flagged_created_at_idx" ON "redeem_claims"("flagged", "created_at");
