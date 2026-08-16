import { apiFetch } from "@/lib/api";
import type {
  ScratchOutcomeOdds,
  ScratchPolicy,
  ScratchPrizeRow,
} from "./scratch-data";

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

export async function saveScratchBundle(bundle: {
  outcomeOdds: ScratchOutcomeOdds;
  policy: ScratchPolicy;
  prizes?: ScratchPrizeRow[];
}): Promise<ScratchBundle> {
  const body: {
    outcomeOdds: ScratchOutcomeOdds;
    policy: ScratchPolicy;
    prizes?: ScratchPrizeRow[];
  } = {
    outcomeOdds: bundle.outcomeOdds,
    policy: bundle.policy,
  };
  if (bundle.prizes !== undefined) body.prizes = bundle.prizes;
  const data = await apiFetch<ScratchBundle>("/api/v1/admin/scratch", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return {
    outcomeOdds: data.outcomeOdds,
    policy: data.policy,
    prizes: data.prizes ?? [],
  };
}

export async function createScratchPrize(
  row: ScratchPrizeRow,
): Promise<ScratchPrizeRow> {
  return apiFetch<ScratchPrizeRow>("/api/v1/admin/scratch/prizes", {
    method: "POST",
    body: JSON.stringify(row),
  });
}

export async function updateScratchPrize(
  id: string,
  row: ScratchPrizeRow,
): Promise<ScratchPrizeRow> {
  return apiFetch<ScratchPrizeRow>(
    `/api/v1/admin/scratch/prizes/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ ...row, id }),
    },
  );
}

export async function deleteScratchPrize(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/scratch/prizes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
