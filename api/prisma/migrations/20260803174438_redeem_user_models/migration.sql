-- CreateEnum
CREATE TYPE "RedeemType" AS ENUM ('GOOGLE_PLAY', 'FF_DIAMONDS');

-- CreateEnum
CREATE TYPE "RedeemCodeStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXHAUSTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RedeemCadence" AS ENUM ('DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "google_sub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "photo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redeem_codes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "RedeemType" NOT NULL,
    "value_label" TEXT NOT NULL,
    "code_secret" TEXT NOT NULL,
    "status" "RedeemCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "cadence" "RedeemCadence" NOT NULL DEFAULT 'DAILY',
    "stock_left" INTEGER NOT NULL,
    "coin_cost" INTEGER,
    "expires_label" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'First Come, First Serve!',
    "redeem_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redeem_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redeem_claims" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "redeem_code_id" TEXT NOT NULL,
    "code_secret" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redeem_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "redeem_claims_redeem_code_id_idx" ON "redeem_claims"("redeem_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "redeem_claims_user_id_redeem_code_id_key" ON "redeem_claims"("user_id", "redeem_code_id");

-- AddForeignKey
ALTER TABLE "redeem_claims" ADD CONSTRAINT "redeem_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redeem_claims" ADD CONSTRAINT "redeem_claims_redeem_code_id_fkey" FOREIGN KEY ("redeem_code_id") REFERENCES "redeem_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
