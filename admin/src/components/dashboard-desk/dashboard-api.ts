import { apiFetch } from "@/lib/api";
import type { DashRangeId, DashSnapshot } from "./dashboard-data";

export function fetchDashSnapshot(range: DashRangeId): Promise<DashSnapshot> {
  return apiFetch<DashSnapshot>(
    `/api/v1/admin/overview/desk?range=${encodeURIComponent(range)}`,
  );
}
