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
    body: "Ordered creatives on the Android home surface — title, art label, and CTA deep link.",
  },
  {
    title: "Schedule window",
    body: "Start / end timestamps control when a promo is eligible. Outside the window it stays out of the live set.",
  },
  {
    title: "Deep links",
    body: "Route users into Redeem, Challenge, Shop, Scratch, or Names without guessing paths in the app.",
  },
  {
    title: "Order & kill switch",
    body: "Sort order drives carousel priority. Disable instantly without deleting the creative.",
  },
] as const;

export const PROMOS_DEMO_ROWS: PromoRow[] = [
  {
    id: "promo_challenge_week",
    title: "Daily Challenge week",
    subtitle: "Complete quizzes for bonus coins before Sunday reset.",
    imageLabel: "challenge-hero",
    deepLink: "ffops://challenge",
    placement: "HOME_BANNER",
    sortOrder: 1,
    enabled: true,
    startsAt: "2026-08-01 00:00",
    endsAt: "2026-08-10 23:59",
    updatedAt: "2026-08-02 11:20",
  },
  {
    id: "promo_scratch_boost",
    title: "Scratch boost",
    subtitle: "Higher redeem odds on milestone cards this weekend.",
    imageLabel: "scratch-gold",
    deepLink: "ffops://scratch",
    placement: "HOME_BANNER",
    sortOrder: 2,
    enabled: true,
    startsAt: "2026-08-02 08:00",
    endsAt: "2026-08-05 23:59",
    updatedAt: "2026-08-02 09:05",
  },
  {
    id: "promo_shop_pack",
    title: "Coin shop pack",
    subtitle: "Starter packs restocked — limited inventory.",
    imageLabel: "shop-pack",
    deepLink: "ffops://shop",
    placement: "HOME_STRIP",
    sortOrder: 3,
    enabled: true,
    startsAt: "2026-08-01 00:00",
    endsAt: "2026-08-31 23:59",
    updatedAt: "2026-07-30 16:40",
  },
  {
    id: "promo_names_frames",
    title: "New name frames",
    subtitle: "Premium wraps landed in Stylish Names.",
    imageLabel: "names-frames",
    deepLink: "ffops://names",
    placement: "HOME_STRIP",
    sortOrder: 4,
    enabled: false,
    startsAt: "2026-08-04 10:00",
    endsAt: "2026-08-20 23:59",
    updatedAt: "2026-08-01 14:12",
  },
  {
    id: "promo_redeem_help",
    title: "Redeem tips",
    subtitle: "How to claim codes without copy failures.",
    imageLabel: "redeem-tips",
    deepLink: "ffops://redeem",
    placement: "HOME_BANNER",
    sortOrder: 5,
    enabled: true,
    startsAt: "2026-08-08 00:00",
    endsAt: "2026-08-15 23:59",
    updatedAt: "2026-08-03 08:30",
  },
  {
    id: "promo_legacy_event",
    title: "July event (archived)",
    subtitle: "Season wrap — kept for audit reference.",
    imageLabel: "july-event",
    deepLink: "ffops://home",
    placement: "HOME_BANNER",
    sortOrder: 6,
    enabled: true,
    startsAt: "2026-07-01 00:00",
    endsAt: "2026-07-31 23:59",
    updatedAt: "2026-08-01 01:00",
  },
];

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

export function emptyPromoForm(nextOrder: number): PromoFormValues {
  return {
    id: "",
    title: "",
    subtitle: "",
    imageLabel: "",
    deepLink: "ffops://home",
    placement: "HOME_BANNER",
    sortOrder: String(nextOrder),
    enabled: true,
    startsAt: "2026-08-03 00:00",
    endsAt: "2026-08-31 23:59",
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
  const deepLink = values.deepLink.trim();
  if (!deepLink) return { error: "Deep link is required." };
  const sortOrder = Number(values.sortOrder);
  if (!Number.isFinite(sortOrder) || sortOrder < 1) {
    return { error: "Sort order must be a number ≥ 1." };
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

  const id =
    values.id.trim() ||
    fallbackId.replace(/[^a-z0-9_]/gi, "_").toLowerCase();

  return {
    id,
    title,
    subtitle: values.subtitle.trim(),
    imageLabel: values.imageLabel.trim() || "untitled",
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
