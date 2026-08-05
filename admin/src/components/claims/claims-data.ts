/**
 * Claims ledger — live Nest RedeemClaim rows (unlock/scratch = claim).
 */

export type ClaimResult = "SUCCESS" | "ALREADY_CLAIMED" | "COPY_FAILED" | "FLAGGED";

export type ClaimListRow = {
  id: string;
  title: string;
  refId: string;
  codeMasked: string;
  deviceId: string;
  result: ClaimResult;
  whenLabel: string;
  stockAfter: number;
  abuseScore: number;
  note: string;
  userDisplayName?: string;
  createdAt?: string;
};

export const CLAIM_RESULT_LABEL: Record<ClaimResult, string> = {
  SUCCESS: "Claimed",
  ALREADY_CLAIMED: "Already claimed",
  COPY_FAILED: "Copy failed",
  FLAGGED: "Flagged",
};

export function computeClaimStats(rows: ClaimListRow[]) {
  return {
    copied: rows.filter((r) => r.result === "SUCCESS").length,
    blocked: rows.filter(
      (r) => r.result === "ALREADY_CLAIMED" || r.result === "COPY_FAILED",
    ).length,
    flagged: rows.filter(
      (r) => r.result === "FLAGGED" || r.abuseScore >= 60,
    ).length,
    devices: new Set(rows.map((r) => r.deviceId)).size,
  };
}

export const CLAIMS_CAPABILITIES = [
  {
    title: "Unlock = claim",
    body: "Scratch unlock posts a Nest claim and consumes stock. Matches the live Android redeem flow.",
  },
  {
    title: "Masked secrets",
    body: "Ops see masked codes only — full secrets stay on the server.",
  },
  {
    title: "One claim / user / code",
    body: "Unique constraint blocks double-claim; already-claimed returns the same code to the owner.",
  },
  {
    title: "Flag for abuse",
    body: "Staff can flag multi-account patterns without deleting the ledger row.",
  },
  {
    title: "Safe delete",
    body: "Delete removes the ledger row but does not restore stock (no re-claim farm).",
  },
  {
    title: "Live Nest sync",
    body: "Queue hits /api/v1/admin/claims — gated by the claims module.",
  },
] as const;
