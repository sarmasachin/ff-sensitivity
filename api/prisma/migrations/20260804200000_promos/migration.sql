-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'promos';

-- CreateEnum
CREATE TYPE "PromoPlacement" AS ENUM ('HOME_BANNER', 'HOME_STRIP');

-- CreateTable
CREATE TABLE "promos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "image_label" TEXT NOT NULL,
    "deep_link" TEXT NOT NULL,
    "placement" "PromoPlacement" NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promos_enabled_placement_sort_order_idx" ON "promos"("enabled", "placement", "sort_order");

-- CreateIndex
CREATE INDEX "promos_starts_at_ends_at_idx" ON "promos"("starts_at", "ends_at");
