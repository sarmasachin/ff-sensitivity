-- CreateTable
CREATE TABLE "app_analytics_events" (
    "id" TEXT NOT NULL,
    "install_id" TEXT,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "props_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_analytics_events_name_created_at_idx" ON "app_analytics_events"("name", "created_at");

-- CreateIndex
CREATE INDEX "app_analytics_events_install_id_created_at_idx" ON "app_analytics_events"("install_id", "created_at");

-- CreateIndex
CREATE INDEX "app_analytics_events_user_id_created_at_idx" ON "app_analytics_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "app_analytics_events_created_at_idx" ON "app_analytics_events"("created_at");
