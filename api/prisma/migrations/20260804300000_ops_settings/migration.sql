-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'settings';

-- CreateTable
CREATE TABLE "ops_settings" (
    "id" INTEGER NOT NULL,
    "preferences" JSONB NOT NULL,
    "session" JSONB NOT NULL,
    "security" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_settings_pkey" PRIMARY KEY ("id")
);