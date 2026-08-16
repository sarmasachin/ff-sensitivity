export type PromoPlacement = "HOME_BANNER" | "HOME_STRIP";

export type PromoStatus = "LIVE" | "SCHEDULED" | "OFF" | "ENDED";

export type PromoRow = {
  id: string;
  title: string;
  subtitle: string;
  imageLabel: string;
  deepLink: string;
  placement: PromoPlacement;
  sortOrder: number;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
  updatedAt: string;
};

export type PromoFormValues = {
  id: string;
  title: string;
  subtitle: string;
  imageLabel: string;
  deepLink: string;
  placement: PromoPlacement;
  sortOrder: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
};

export const PROMO_PLACEMENT_LABEL: Record<PromoPlacement, string> = {
  HOME_BANNER: "Home banner",
  HOME_STRIP: "Home strip",
};

export const PROMOS_CAPABILITIES = [
  {
    title: "Home banners",
    body: "Ordered creatives on Android home — Nest GET /api/v1/promos/live.",
  },
  {
    title: "Schedule window",
    body: "Start / end timestamps are enforced server-side. Outside the window stays out of the live set.",
  },
  {
    title: "Deep links",
    body: "Only allowlisted ffops:// routes (challenge, scratch, shop, redeem, names, home).",
  },
  {
    title: "Order & kill switch",
    body: "Add, edit, disable, delete, and reorder persist immediately. Sort order drives carousel priority.",
  },
] as const;

/** Parse "YYYY-MM-DD HH:mm" as local wall time. */
export function parsePromoStamp(stamp: string): number | null {
  const m = stamp
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const t = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
  ).getTime();
  return Number.isFinite(t) ? t : null;
}

export function resolvePromoStatus(
  row: Pick<PromoRow, "enabled" | "startsAt" | "endsAt">,
  nowMs: number = Date.now(),
): PromoStatus {
  if (!row.enabled) return "OFF";
  const start = parsePromoStamp(row.startsAt);
  const end = parsePromoStamp(row.endsAt);
  if (start == null || end == null) return "OFF";
  if (nowMs < start) return "SCHEDULED";
  if (nowMs > end) return "ENDED";
  return "LIVE";
}

export function isEndingSoon(
  row: Pick<PromoRow, "enabled" | "startsAt" | "endsAt">,
  nowMs: number = Date.now(),
  withinMs: number = 3 * 24 * 60 * 60 * 1000,
): boolean {
  if (resolvePromoStatus(row, nowMs) !== "LIVE") return false;
  const end = parsePromoStamp(row.endsAt);
  if (end == null) return false;
  return end - nowMs <= withinMs && end >= nowMs;
}

export function computePromoStats(rows: PromoRow[], nowMs: number = Date.now()) {
  let live = 0;
  let scheduled = 0;
  let off = 0;
  let ended = 0;
  let endingSoon = 0;
  for (const row of rows) {
    const status = resolvePromoStatus(row, nowMs);
    if (status === "LIVE") live += 1;
    else if (status === "SCHEDULED") scheduled += 1;
    else if (status === "ENDED") ended += 1;
    else off += 1;
    if (isEndingSoon(row, nowMs)) endingSoon += 1;
  }
  return {
    total: rows.length,
    live,
    scheduled,
    off,
    ended,
    endingSoon,
  };
}

export function formatPromoStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function emptyPromoForm(nextOrder: number): PromoFormValues {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return {
    id: "",
    title: "",
    subtitle: "",
    imageLabel: "",
    deepLink: "ffops://home",
    placement: "HOME_BANNER",
    sortOrder: String(nextOrder),
    enabled: true,
    startsAt: formatPromoStamp(start),
    endsAt: formatPromoStamp(end),
  };
}

export function promoToForm(row: PromoRow): PromoFormValues {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageLabel: row.imageLabel,
    deepLink: row.deepLink,
    placement: row.placement,
    sortOrder: String(row.sortOrder),
    enabled: row.enabled,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}

export function formToPromo(
  values: PromoFormValues,
  fallbackId: string,
  updatedAt: string,
): PromoRow | { error: string } {
  const title = values.title.trim();
  if (!title) return { error: "Title is required." };
  if (title.length > 80) return { error: "Title must be 80 characters or less." };
  if (values.subtitle.trim().length > 160) {
    return { error: "Subtitle must be 160 characters or less." };
  }
  const deepLink = values.deepLink.trim();
  if (!deepLink) return { error: "Deep link is required." };
  if (!/^ffops:\/\/[a-z0-9_]+$/i.test(deepLink)) {
    return {
      error: "Deep link must be ffops://path (allowlisted app route).",
    };
  }
  const sortOrder = Number(values.sortOrder);
  if (!Number.isFinite(sortOrder) || sortOrder < 1 || sortOrder > 100) {
    return { error: "Sort order must be a number from 1 to 100." };
  }
  if (!parsePromoStamp(values.startsAt)) {
    return { error: "Start must be YYYY-MM-DD HH:mm." };
  }
  if (!parsePromoStamp(values.endsAt)) {
    return { error: "End must be YYYY-MM-DD HH:mm." };
  }
  const start = parsePromoStamp(values.startsAt)!;
  const end = parsePromoStamp(values.endsAt)!;
  if (end <= start) return { error: "End must be after start." };

  const id = (values.id.trim() || fallbackId)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 64);
  if (!id) return { error: "Promo id is required." };

  const imageLabel =
    values.imageLabel
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 64) || "untitled";

  return {
    id,
    title,
    subtitle: values.subtitle.trim(),
    imageLabel,
    deepLink,
    placement: values.placement,
    sortOrder: Math.floor(sortOrder),
    enabled: values.enabled,
    startsAt: values.startsAt.trim(),
    endsAt: values.endsAt.trim(),
    updatedAt,
  };
}

export const PROMO_STATUS_LABEL: Record<PromoStatus, string> = {
  LIVE: "Live",
  SCHEDULED: "Scheduled",
  OFF: "Off",
  ENDED: "Ended",
};

export const PROMO_STATUS_CLASS: Record<PromoStatus, string> = {
  LIVE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  SCHEDULED: "bg-amber-50 text-amber-900 ring-amber-200",
  OFF: "bg-slate-100 text-slate-600 ring-slate-200",
  ENDED: "bg-rose-50 text-rose-800 ring-rose-200",
};
