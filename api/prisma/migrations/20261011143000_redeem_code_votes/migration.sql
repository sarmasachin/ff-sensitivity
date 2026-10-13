CREATE TABLE "redeem_code_votes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "redeem_code_id" TEXT NOT NULL,
    "worked" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redeem_code_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "redeem_code_votes_user_id_redeem_code_id_key" ON "redeem_code_votes"("user_id", "redeem_code_id");

CREATE INDEX "redeem_code_votes_redeem_code_id_worked_idx" ON "redeem_code_votes"("redeem_code_id", "worked");

ALTER TABLE "redeem_code_votes" ADD CONSTRAINT "redeem_code_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "redeem_code_votes" ADD CONSTRAINT "redeem_code_votes_redeem_code_id_fkey" FOREIGN KEY ("redeem_code_id") REFERENCES "redeem_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
