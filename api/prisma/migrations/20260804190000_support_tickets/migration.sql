-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'support';

-- CreateEnum
CREATE TYPE "SupportSubject" AS ENUM ('REPORT', 'REDEEM_CODE_ISSUE', 'BUG', 'FEATURE', 'FEEDBACK', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'PENDING_REPLY', 'REPLIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportSender" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "support_threads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" "SupportSubject" NOT NULL,
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "app_version" TEXT NOT NULL,
    "device_label" TEXT NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender" "SupportSender" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_threads_status_updated_at_idx" ON "support_threads"("status", "updated_at");

-- CreateIndex
CREATE INDEX "support_threads_user_id_status_idx" ON "support_threads"("user_id", "status");

-- CreateIndex
CREATE INDEX "support_threads_unread_updated_at_idx" ON "support_threads"("unread", "updated_at");

-- CreateIndex
CREATE INDEX "support_messages_thread_id_created_at_idx" ON "support_messages"("thread_id", "created_at");

-- AddForeignKey
ALTER TABLE "support_threads" ADD CONSTRAINT "support_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "support_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
