-- CreateTable
CREATE TABLE IF NOT EXISTS "wallet_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_boost_charges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "boost_id" TEXT NOT NULL,
    "charges" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_boost_charges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_ledger_idempotency_key_key" ON "wallet_ledger"("idempotency_key");
CREATE INDEX IF NOT EXISTS "wallet_ledger_user_id_created_at_idx" ON "wallet_ledger"("user_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "user_boost_charges_user_id_boost_id_key" ON "user_boost_charges"("user_id", "boost_id");

DO $$ BEGIN
 ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "user_boost_charges" ADD CONSTRAINT "user_boost_charges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
