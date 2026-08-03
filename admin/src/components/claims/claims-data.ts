/**
 * Claims ledger rule (product):
 * A claim is recorded ONLY when the user receives a redeem code AND taps Copy.
 * Unlock / view without Copy → no claim row.
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
};

export const CLAIM_RESULT_LABEL: Record<ClaimResult, string> = {
  SUCCESS: "Copied",
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

export const CLAIMS_DEMO_ROWS: ClaimListRow[] = [
  {
    id: "cl1",
    title: "Google Play ₹50",
    refId: "code_1",
    codeMasked: "XXXX-XXXX-A9F2",
    deviceId: "dev_8f2a91c0",
    result: "SUCCESS",
    whenLabel: "12 min ago",
    stockAfter: 4,
    abuseScore: 5,
    note: "Code unlocked → user tapped Copy. Claim recorded.",
  },
  {
    id: "cl2",
    title: "Play Gift low stock",
    refId: "code_3",
    codeMasked: "XXXX-XXXX-B1C0",
    deviceId: "dev_11bc44e2",
    result: "SUCCESS",
    whenLabel: "1h ago",
    stockAfter: 0,
    abuseScore: 35,
    note: "Last unit · Copy confirmed · stock now 0.",
  },
  {
    id: "cl3",
    title: "Google Play ₹100",
    refId: "code_2",
    codeMasked: "XXXX-XXXX-77EE",
    deviceId: "dev_8f2a91c0",
    result: "ALREADY_CLAIMED",
    whenLabel: "2h ago",
    stockAfter: 2,
    abuseScore: 55,
    note: "Same device tapped Copy again within cadence — blocked.",
  },
  {
    id: "cl4",
    title: "Google Play ₹50",
    refId: "code_1",
    codeMasked: "XXXX-XXXX-A9F2",
    deviceId: "dev_77c1d009",
    result: "COPY_FAILED",
    whenLabel: "5h ago",
    stockAfter: 5,
    abuseScore: 10,
    note: "Clipboard write failed — no claim until Copy succeeds.",
  },
  {
    id: "cl5",
    title: "Google Play ₹50",
    refId: "code_1",
    codeMasked: "XXXX-XXXX-A9F2",
    deviceId: "dev_99aa12ff",
    result: "FLAGGED",
    whenLabel: "Yesterday",
    stockAfter: 5,
    abuseScore: 88,
    note: "Copy success but multi-device pattern — staff review.",
  },
  {
    id: "cl6",
    title: "Google Play ₹100",
    refId: "code_2",
    codeMasked: "XXXX-XXXX-77EE",
    deviceId: "dev_55ee90ab",
    result: "SUCCESS",
    whenLabel: "Yesterday",
    stockAfter: 1,
    abuseScore: 8,
    note: "Code unlocked → Copy tapped. Claim recorded.",
  },
  {
    id: "cl7",
    title: "FF Diamonds 100",
    refId: "code_4",
    codeMasked: "XXXX-XXXX-D4D4",
    deviceId: "dev_33bb01aa",
    result: "SUCCESS",
    whenLabel: "2 days ago",
    stockAfter: 11,
    abuseScore: 12,
    note: "Code unlocked → Copy tapped. Claim recorded.",
  },
];

export const CLAIMS_CAPABILITIES = [
  {
    title: "Copy = claim",
    body: "Ledger entry only after code is shown and user taps Copy. No Copy → no claim.",
  },
  {
    title: "Stock on copy",
    body: "Inventory decrement ties to successful Copy, not to unlock/view alone.",
  },
  {
    title: "Already claimed",
    body: "Repeat Copy on the same cadence window is blocked and logged.",
  },
  {
    title: "Copy failed",
    body: "Clipboard errors do not consume stock or count as a claim.",
  },
  {
    title: "Abuse on copies",
    body: "Flag multi-device copy patterns for staff triage.",
  },
  {
    title: "API sync",
    body: "NestJS: emit claim on Copy event from Android — UI is local draft.",
  },
] as const;
