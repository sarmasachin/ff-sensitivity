import { apiFetch } from "@/lib/api";
import type {
  OverviewSeries,
  OverviewSeriesRange,
  OverviewSnapshot,
} from "./overview-data";

export async function fetchOverviewSnapshot(): Promise<OverviewSnapshot> {
  return apiFetch<OverviewSnapshot>("/api/v1/admin/overview");
}

export async function fetchOverviewSeries(
  range: OverviewSeriesRange,
): Promise<OverviewSeries> {
  return apiFetch<OverviewSeries>(
    `/api/v1/admin/overview/series?range=${encodeURIComponent(range)}`,
  );
}
