CREATE TABLE "scratch_archive_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "reward_label" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "badge" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scratch_archive_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scratch_archive_entries_user_id_source_key_key" ON "scratch_archive_entries"("user_id", "source_key");

CREATE INDEX "scratch_archive_entries_user_id_created_at_idx" ON "scratch_archive_entries"("user_id", "created_at");

ALTER TABLE "scratch_archive_entries" ADD CONSTRAINT "scratch_archive_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
