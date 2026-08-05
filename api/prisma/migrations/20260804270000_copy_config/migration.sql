-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'copy';

-- CreateTable
CREATE TABLE "copy_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "rate_json" JSONB NOT NULL,
    "share_json" JSONB NOT NULL,
    "about_json" JSONB NOT NULL,
    "legal_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copy_config_pkey" PRIMARY KEY ("id")
);
