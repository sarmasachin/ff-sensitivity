-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'devices';

-- AlterTable
ALTER TABLE "device_push_tokens" ADD COLUMN "install_id" TEXT;

-- CreateIndex
CREATE INDEX "device_push_tokens_install_id_idx" ON "device_push_tokens"("install_id");

-- CreateTable
CREATE TABLE "device_installs" (
    "id" TEXT NOT NULL,
    "install_id" TEXT NOT NULL,
    "user_id" TEXT,
    "brand" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "android_version" TEXT NOT NULL DEFAULT '',
    "app_version" TEXT NOT NULL DEFAULT '',
    "app_version_code" INTEGER NOT NULL DEFAULT 0,
    "fcm_token_hint" TEXT NOT NULL DEFAULT '',
    "has_fcm_token" BOOLEAN NOT NULL DEFAULT false,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_installs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_installs_install_id_key" ON "device_installs"("install_id");

-- CreateIndex
CREATE INDEX "device_installs_blocked_last_seen_at_idx" ON "device_installs"("blocked", "last_seen_at");

-- CreateIndex
CREATE INDEX "device_installs_user_id_idx" ON "device_installs"("user_id");

-- AddForeignKey
ALTER TABLE "device_installs" ADD CONSTRAINT "device_installs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
