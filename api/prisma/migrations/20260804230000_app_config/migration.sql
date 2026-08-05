-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'app';

-- CreateTable
CREATE TABLE "app_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_message" TEXT NOT NULL DEFAULT '',
    "force_update" BOOLEAN NOT NULL DEFAULT false,
    "soft_update_prompt" BOOLEAN NOT NULL DEFAULT true,
    "min_version_code" INTEGER NOT NULL DEFAULT 1,
    "min_version_name" TEXT NOT NULL DEFAULT '1.0.0',
    "features_json" JSONB NOT NULL,
    "navigation_json" JSONB NOT NULL,
    "play_store_url" TEXT NOT NULL,
    "privacy_url" TEXT NOT NULL,
    "website_url" TEXT NOT NULL,
    "support_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);
