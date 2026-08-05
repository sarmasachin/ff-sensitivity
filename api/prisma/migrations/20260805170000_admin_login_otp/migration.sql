CREATE TABLE "admin_login_otps" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resend_count" INTEGER NOT NULL DEFAULT 0,
    "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_login_otps_admin_id_created_at_idx"
ON "admin_login_otps"("admin_id", "created_at");

CREATE INDEX "admin_login_otps_expires_at_idx"
ON "admin_login_otps"("expires_at");

ALTER TABLE "admin_login_otps"
ADD CONSTRAINT "admin_login_otps_admin_id_fkey"
FOREIGN KEY ("admin_id") REFERENCES "admins"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
