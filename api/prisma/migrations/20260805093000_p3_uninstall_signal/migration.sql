-- P3: FCM "registration-token-not-registered" is a suspected uninstall
-- signal, not a definitive Play Store uninstall count.
ALTER TABLE "device_installs"
ADD COLUMN "uninstall_suspected_at" TIMESTAMP(3);

CREATE INDEX "device_installs_uninstall_suspected_at_idx"
ON "device_installs"("uninstall_suspected_at");
