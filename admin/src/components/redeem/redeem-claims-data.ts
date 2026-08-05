export type ClaimResult =
  | "SUCCESS"
  | "FAILED"
  | "ALREADY_CLAIMED"
  | "OUT_OF_STOCK"
  | "FLAGGED";

export type RedeemClaimRow = {
  id: string;
  codeId: string;
  codeTitle: string;
  deviceId: string;
  result: ClaimResult;
  whenLabel: string;
  stockAfter: number;
};
