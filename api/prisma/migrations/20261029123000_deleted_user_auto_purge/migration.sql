-- CreateIndex
CREATE INDEX "users_data_deleted_at_idx" ON "users"("data_deleted_at");

-- CreateTable
CREATE TABLE "banned_google_accounts" (
    "id" TEXT NOT NULL,
    "google_sub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "banned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banned_google_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banned_google_accounts_google_sub_key" ON "banned_google_accounts"("google_sub");

-- CreateIndex
CREATE INDEX "banned_google_accounts_email_idx" ON "banned_google_accounts"("email");
