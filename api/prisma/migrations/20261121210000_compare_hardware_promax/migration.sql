-- AlterTable: optional hardware fingerprint for Pro Max peer matching
ALTER TABLE "sensitivity_compares" ADD COLUMN "ram_gb" DOUBLE PRECISION,
ADD COLUMN "ram_bucket" INTEGER,
ADD COLUMN "processor_brand" TEXT,
ADD COLUMN "processor_type" TEXT,
ADD COLUMN "gpu_label" TEXT,
ADD COLUMN "gpu_vendor" TEXT;

CREATE INDEX "sensitivity_compares_device_label_fingers_role_idx"
  ON "sensitivity_compares"("device_label", "fingers", "role");

CREATE INDEX "sensitivity_compares_ram_bucket_processor_brand_gpu_vendor_fingers_role_idx"
  ON "sensitivity_compares"("ram_bucket", "processor_brand", "gpu_vendor", "fingers", "role");
