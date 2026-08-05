-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'wallets';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "wallet_frozen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "wallet_note" TEXT NOT NULL DEFAULT '';
