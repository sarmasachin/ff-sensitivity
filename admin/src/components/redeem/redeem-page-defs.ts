import type { Dispatch, SetStateAction } from "react";
import {
  createRedeemCadence,
  createRedeemType,
} from "./redeem-api";
import type { RedeemCadenceRow, RedeemTypeRow } from "./redeem-data";
import { REDEEM_TOAST_TITLES } from "./redeem-toast";
import type { RedeemToastTone } from "./redeem-toast";

type PushToast = (
  tone: RedeemToastTone,
  title: string,
  message: string,
) => void;

export async function addRedeemTypeDef(
  input: { id: string; label: string },
  setTypes: Dispatch<SetStateAction<RedeemTypeRow[]>>,
  pushToast: PushToast,
): Promise<string | null> {
  try {
    const row = await createRedeemType(input);
    setTypes((prev) => {
      if (prev.some((t) => t.id === row.id)) return prev;
      return [...prev, row].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    pushToast("success", REDEEM_TOAST_TITLES.added, `Type “${row.label}” is live.`);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Failed to add type.";
  }
}

export async function addRedeemCadenceDef(
  input: {
    id: string;
    label: string;
    claimLimit?: number;
    windowHours?: number;
  },
  setCadences: Dispatch<SetStateAction<RedeemCadenceRow[]>>,
  pushToast: PushToast,
): Promise<string | null> {
  try {
    const row = await createRedeemCadence(input);
    setCadences((prev) => {
      if (prev.some((c) => c.id === row.id)) return prev;
      return [...prev, row].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    pushToast(
      "success",
      REDEEM_TOAST_TITLES.added,
      `Cadence “${row.label}” is live.`,
    );
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Failed to add cadence.";
  }
}
