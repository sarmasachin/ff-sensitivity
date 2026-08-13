"use client";

import { useCallback, useState } from "react";
import {
  createRedeemToast,
  type RedeemToastItem,
  type RedeemToastTone,
} from "./redeem-toast";

export function useRedeemToasts() {
  const [toasts, setToasts] = useState<RedeemToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (
      tone: RedeemToastTone,
      title: string,
      message: string,
      opts?: { actionLabel?: string; durationMs?: number },
    ) => {
      const item = createRedeemToast(tone, title, message, opts);
      setToasts((prev) => [...prev.slice(-2), item]);
      return item.id;
    },
    [],
  );

  const clear = useCallback(() => setToasts([]), []);

  return { toasts, push, dismiss, clear };
}
