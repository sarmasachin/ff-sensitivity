-- CreateEnum
CREATE TYPE "CommunityPostStatus" AS ENUM ('PENDING', 'APPROVED', 'FEATURED', 'HIDDEN');

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "free_fire_id" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "device_label" TEXT NOT NULL,
    "device_meta" TEXT NOT NULL DEFAULT '',
    "matches" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "headshots" INTEGER NOT NULL,
    "general" INTEGER NOT NULL,
    "red_dot" INTEGER NOT NULL,
    "scope_2x" INTEGER NOT NULL,
    "scope_4x" INTEGER NOT NULL,
    "awm" INTEGER NOT NULL,
    "free_look" INTEGER NOT NULL,
    "status" "CommunityPostStatus" NOT NULL DEFAULT 'PENDING',
    "reports" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_reports" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_posts_status_created_at_idx" ON "community_posts"("status", "created_at");

-- CreateIndex
CREATE INDEX "community_posts_user_id_status_idx" ON "community_posts"("user_id", "status");

-- CreateIndex
CREATE INDEX "community_post_reports_user_id_idx" ON "community_post_reports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_reports_post_id_user_id_key" ON "community_post_reports"("post_id", "user_id");

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reports" ADD CONSTRAINT "community_post_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reports" ADD CONSTRAINT "community_post_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
