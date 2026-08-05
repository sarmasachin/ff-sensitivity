-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "coins" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "redeem_codes" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);

-- Harden stock: one unit per unique secret
UPDATE "redeem_codes" SET "stock_left" = 1 WHERE "stock_left" > 1;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "redeem_codes_code_secret_key" ON "redeem_codes"("code_secret");
