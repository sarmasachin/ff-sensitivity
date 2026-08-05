import { apiFetch } from "@/lib/api";
import type {
  ScratchOutcomeOdds,
  ScratchPolicy,
  ScratchPrizeRow,
} from "./scratch-data";

// --- Start: Scratch live wire (Sachin) ---
export type ScratchBundle = {
  outcomeOdds: ScratchOutcomeOdds;
  policy: ScratchPolicy;
  prizes: ScratchPrizeRow[];
};

export async function fetchScratchBundle(): Promise<ScratchBundle> {
  const data = await apiFetch<ScratchBundle>("/api/v1/admin/scratch");
  return {
    outcomeOdds: data.outcomeOdds,
    policy: data.policy,
    prizes: data.prizes ?? [],
  };
}

export async function saveScratchBundle(
  bundle: ScratchBundle,
): Promise<ScratchBundle> {
  const data = await apiFetch<ScratchBundle>("/api/v1/admin/scratch", {
    method: "PUT",
    body: JSON.stringify(bundle),
  });
  return {
    outcomeOdds: data.outcomeOdds,
    policy: data.policy,
    prizes: data.prizes ?? [],
  };
}
// --- End: Scratch live wire (Sachin) ---
