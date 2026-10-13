CREATE TABLE "redeem_code_comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "redeem_code_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redeem_code_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "redeem_code_comments_redeem_code_id_created_at_idx" ON "redeem_code_comments"("redeem_code_id", "created_at");

ALTER TABLE "redeem_code_comments" ADD CONSTRAINT "redeem_code_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "redeem_code_comments" ADD CONSTRAINT "redeem_code_comments_redeem_code_id_fkey" FOREIGN KEY ("redeem_code_id") REFERENCES "redeem_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
