export type PushAudience = "ALL" | "ACTIVE_7D" | "NO_CLAIM" | "TOPIC";

export type PushStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

export type PushCampaignRow = {
  id: string;
  title: string;
  body: string;
  deepLink: string;
  audience: PushAudience;
  topic: string;
  status: PushStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  delivered: number;
  failed: number;
  createdBy: string;
  updatedAt: string;
};

export type PushFormValues = {
  id: string;
  title: string;
  body: string;
  deepLink: string;
  audience: PushAudience;
  topic: string;
  scheduleMode: "now" | "later" | "draft";
  scheduledAt: string;
};

export const PUSH_AUDIENCE_LABEL: Record<PushAudience, string> = {
  ALL: "All devices",
  ACTIVE_7D: "Active 7 days",
  NO_CLAIM: "No claim yet",
  TOPIC: "FCM topic",
};

export const PUSH_STATUS_LABEL: Record<PushStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENT: "Sent",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const PUSH_STATUS_CLASS: Record<PushStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  SCHEDULED: "bg-cyan-50 text-cyan-900 ring-cyan-200",
  SENT: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  FAILED: "bg-rose-50 text-rose-800 ring-rose-200",
  CANCELLED: "bg-amber-50 text-amber-900 ring-amber-200",
};

export const PUSH_CAPABILITIES = [
  {
    title: "Compose",
    body: "Title, body, and destination page (Home, Challenge, Shop, DPI, Inbox, …).",
  },
  {
    title: "Audience",
    body: "Target registered device tokens: all, active 7d, no-claim, or an FCM topic.",
  },
  {
    title: "Schedule",
    body: "Draft, queue for a wall-clock send, or keep ready for Admin send.",
  },
  {
    title: "Send authority",
    body: "Live send is Super Admin / Admin only. Module ACL gates the rest of the desk.",
  },
] as const;

/** Client-side allowlist — must match Nest push-security. */
export const PUSH_ALLOWED_DEEP_PATHS = new Set([
  "home",
  "challenge",
  "daily_challenge",
  "scratch",
  "shop",
  "coin_shop",
  "redeem",
  "names",
  "stylish",
  "inbox",
  "notifications",
  "push_inbox",
  "contact",
  "support",
  "about",
  "share",
  "share_sensi",
  "sensi",
  "hud",
  "graphics",
  "dpi",
]);

/** Admin picker — label → ffops path (what opens in the Android app). */
export const PUSH_DEEP_LINK_OPTIONS: { label: string; path: string }[] = [
  { label: "Home", path: "home" },
  { label: "Best Sensitivity (device scan)", path: "sensi" },
  { label: "Custom HUD (device scan)", path: "hud" },
  { label: "Graphics Settings (device scan)", path: "graphics" },
  { label: "DPI & Resolution (device scan)", path: "dpi" },
  { label: "Daily Challenge", path: "challenge" },
  { label: "Scratch Cards", path: "scratch" },
  { label: "Coin Shop", path: "shop" },
  { label: "Redeem", path: "redeem" },
  { label: "Stylish Names", path: "names" },
  { label: "Share Sensitivity", path: "share" },
  { label: "Notifications Inbox", path: "inbox" },
  { label: "Contact / Support", path: "contact" },
  { label: "About", path: "about" },
];

export function assertClientDeepLink(raw: string): string | null {
  const link = raw.trim().toLowerCase();
  if (!link.startsWith("ffops://")) {
    return "Deep link must use ffops://";
  }
  try {
    const u = new URL(link);
    if (u.username || u.password) return "Deep link must not include credentials.";
    const path = (u.hostname || u.pathname.replace(/^\//, ""))
      .split("/")[0]
      ?.replace(/[^a-z0-9_]/g, "");
    if (!path || !PUSH_ALLOWED_DEEP_PATHS.has(path)) {
      return "Deep link path is not allowlisted.";
    }
  } catch {
    return "Deep link is invalid.";
  }
  return null;
}
export function computePushStats(rows: PushCampaignRow[]) {
  let scheduled = 0;
  let drafts = 0;
  let sent = 0;
  let failed = 0;
  let delivered = 0;
  for (const row of rows) {
    if (row.status === "SCHEDULED") scheduled += 1;
    else if (row.status === "DRAFT") drafts += 1;
    else if (row.status === "SENT") sent += 1;
    else if (row.status === "FAILED") failed += 1;
    delivered += row.delivered;
  }
  return {
    total: rows.length,
    scheduled,
    drafts,
    sent,
    failed,
    delivered,
  };
}

export function emptyPushForm(): PushFormValues {
  return {
    id: "",
    title: "",
    body: "",
    deepLink: "ffops://home",
    audience: "ALL",
    topic: "",
    scheduleMode: "draft",
    scheduledAt: "2026-08-04 10:00",
  };
}

export function campaignToForm(row: PushCampaignRow): PushFormValues {
  let scheduleMode: PushFormValues["scheduleMode"] = "draft";
  if (row.status === "SCHEDULED") scheduleMode = "later";
  else if (row.status === "SENT" || row.status === "FAILED") scheduleMode = "now";
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    deepLink: row.deepLink,
    audience: row.audience,
    topic: row.topic,
    scheduleMode,
    scheduledAt: row.scheduledAt ?? "2026-08-04 10:00",
  };
}

function parseStamp(stamp: string): boolean {
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(stamp.trim());
}

export function formToCampaign(
  values: PushFormValues,
  fallbackId: string,
  updatedAt: string,
  existing?: PushCampaignRow | null,
): PushCampaignRow | { error: string } {
  const title = values.title.trim();
  if (!title) return { error: "Title is required." };
  const body = values.body.trim();
  if (!body) return { error: "Body is required." };
  const deepLink = values.deepLink.trim();
  if (!deepLink) return { error: "Deep link is required." };
  const linkErr = assertClientDeepLink(deepLink);
  if (linkErr) return { error: linkErr };
  if (values.audience === "TOPIC" && !values.topic.trim()) {
    return { error: "Topic is required for FCM topic audience." };
  }
  if (values.audience === "TOPIC" && !/^[a-z0-9_]{1,64}$/i.test(values.topic.trim())) {
    return { error: "Topic must be snake_case alphanumeric." };
  }
  if (values.scheduleMode === "later" && !parseStamp(values.scheduledAt)) {
    return { error: "Schedule must be YYYY-MM-DD HH:mm." };
  }

  let status: PushStatus = "DRAFT";
  let scheduledAt: string | null = null;
  if (values.scheduleMode === "later") {
    status = "SCHEDULED";
    scheduledAt = values.scheduledAt.trim();
  } else if (values.scheduleMode === "now") {
    // Queued for Admin send — stays draft until Send is pressed.
    status = "DRAFT";
  }

  if (existing && (existing.status === "SENT" || existing.status === "FAILED")) {
    status = existing.status;
    scheduledAt = existing.scheduledAt;
  }

  const id =
    values.id.trim() ||
    fallbackId.replace(/[^a-z0-9_]/gi, "_").toLowerCase();

  return {
    id,
    title,
    body,
    deepLink,
    audience: values.audience,
    topic: values.audience === "TOPIC" ? values.topic.trim() : "",
    status,
    scheduledAt,
    sentAt: existing?.sentAt ?? null,
    delivered: existing?.delivered ?? 0,
    failed: existing?.failed ?? 0,
    createdBy: existing?.createdBy ?? "admin",
    updatedAt,
  };
}

export function canSendCampaign(row: PushCampaignRow): boolean {
  return row.status === "DRAFT" || row.status === "SCHEDULED";
}

export function canCancelCampaign(row: PushCampaignRow): boolean {
  return row.status === "SCHEDULED" || row.status === "DRAFT";
}
