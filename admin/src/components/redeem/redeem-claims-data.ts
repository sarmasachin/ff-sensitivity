export type ClaimResult = "SUCCESS" | "FAILED" | "ALREADY_CLAIMED" | "OUT_OF_STOCK";

export type RedeemClaimRow = {
  id: string;
  codeId: string;
  codeTitle: string;
  deviceId: string;
  result: ClaimResult;
  whenLabel: string;
  stockAfter: number;
};

export const REDEEM_CLAIM_DEMO: RedeemClaimRow[] = [
  {
    id: "cl1",
    codeId: "1",
    codeTitle: "Google Play ₹50",
    deviceId: "dev_8f2a91c0",
    result: "SUCCESS",
    whenLabel: "12 min ago",
    stockAfter: 4,
  },
  {
    id: "cl2",
    codeId: "3",
    codeTitle: "Play Gift low stock",
    deviceId: "dev_11bc44e2",
    result: "SUCCESS",
    whenLabel: "1h ago",
    stockAfter: 0,
  },
  {
    id: "cl3",
    codeId: "2",
    codeTitle: "Google Play ₹100",
    deviceId: "dev_8f2a91c0",
    result: "ALREADY_CLAIMED",
    whenLabel: "2h ago",
    stockAfter: 2,
  },
  {
    id: "cl4",
    codeId: "3",
    codeTitle: "Play Gift low stock",
    deviceId: "dev_99aa12ff",
    result: "OUT_OF_STOCK",
    whenLabel: "3h ago",
    stockAfter: 0,
  },
  {
    id: "cl5",
    codeId: "1",
    codeTitle: "Google Play ₹50",
    deviceId: "dev_77c1d009",
    result: "FAILED",
    whenLabel: "Yesterday",
    stockAfter: 5,
  },
  {
    id: "cl6",
    codeId: "2",
    codeTitle: "Google Play ₹100",
    deviceId: "dev_55ee90ab",
    result: "SUCCESS",
    whenLabel: "Yesterday",
    stockAfter: 1,
  },
];
