-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'names';

-- CreateTable
CREATE TABLE "names_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "max_name_chars" INTEGER NOT NULL DEFAULT 12,
    "max_batch_size" INTEGER NOT NULL DEFAULT 100,
    "allow_spaces_in_input" BOOLEAN NOT NULL DEFAULT false,
    "require_style_wrap" BOOLEAN NOT NULL DEFAULT true,
    "remote_pack_enabled" BOOLEAN NOT NULL DEFAULT false,
    "remote_pack_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "names_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "name_frames" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "suffix" TEXT NOT NULL DEFAULT '',
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "name_frames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "name_fonts" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sample" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "name_fonts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "name_frames_enabled_sort_order_idx" ON "name_frames"("enabled", "sort_order");

-- CreateIndex
CREATE INDEX "name_fonts_enabled_sort_order_idx" ON "name_fonts"("enabled", "sort_order");
