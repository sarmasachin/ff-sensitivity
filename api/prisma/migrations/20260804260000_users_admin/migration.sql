-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'users';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_restricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "account_note" TEXT NOT NULL DEFAULT '';
