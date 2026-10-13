CREATE TABLE "sensitivity_compares" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_label" TEXT NOT NULL,
    "fingers" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "dpi_preference" TEXT NOT NULL,
    "screen_guard" TEXT NOT NULL,
    "suggested_general" INTEGER NOT NULL,
    "suggested_red_dot" INTEGER NOT NULL,
    "suggested_scope_2x" INTEGER NOT NULL,
    "suggested_scope_4x" INTEGER NOT NULL,
    "suggested_sniper" INTEGER NOT NULL,
    "suggested_free_look" INTEGER NOT NULL,
    "suggested_fire_button" INTEGER NOT NULL,
    "actual_general" INTEGER NOT NULL,
    "actual_red_dot" INTEGER NOT NULL,
    "actual_scope_2x" INTEGER NOT NULL,
    "actual_scope_4x" INTEGER NOT NULL,
    "actual_sniper" INTEGER NOT NULL,
    "actual_free_look" INTEGER NOT NULL,
    "actual_fire_button" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensitivity_compares_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sensitivity_compares_created_at_idx" ON "sensitivity_compares"("created_at");

CREATE INDEX "sensitivity_compares_fingers_role_created_at_idx" ON "sensitivity_compares"("fingers", "role", "created_at");

CREATE INDEX "sensitivity_compares_user_id_created_at_idx" ON "sensitivity_compares"("user_id", "created_at");

ALTER TABLE "sensitivity_compares" ADD CONSTRAINT "sensitivity_compares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
