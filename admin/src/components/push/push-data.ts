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
    body: "Title, body, and deep link for Android FCM. Keep copy short — tray space is limited.",
  },
  {
    title: "Audience",
    body: "Target all tokens, recent actives, no-claim devices, or a named FCM topic.",
  },
  {
    title: "Schedule",
    body: "Save as draft, queue for a wall-clock send, or mark send-now for Admin approval flow.",
  },
  {
    title: "Send authority",
    body: "Live send is Super Admin / Admin only. Operators can draft and schedule; send is gated.",
  },
] as const;

export const PUSH_DEMO_ROWS: PushCampaignRow[] = [
  {
    id: "push_challenge_open",
    title: "Daily Challenge is live",
    body: "Quiz window is open — claim coins before it closes.",
    deepLink: "ffops://challenge",
    audience: "ACTIVE_7D",
    topic: "",
    status: "SENT",
    scheduledAt: null,
    sentAt: "2026-08-03 09:15",
    delivered: 18420,
    failed: 112,
    createdBy: "admin",
    updatedAt: "2026-08-03 09:16",
  },
  {
    id: "push_scratch_weekend",
    title: "Scratch boost weekend",
    body: "Higher redeem odds on milestone cards through Sunday.",
    deepLink: "ffops://scratch",
    audience: "ALL",
    topic: "",
    status: "SCHEDULED",
    scheduledAt: "2026-08-04 10:00",
    sentAt: null,
    delivered: 0,
    failed: 0,
    createdBy: "admin",
    updatedAt: "2026-08-02 18:40",
  },
  {
    id: "push_redeem_nudge",
    title: "Unused redeem codes",
    body: "You still have codes waiting — open Redeem to claim.",
    deepLink: "ffops://redeem",
    audience: "NO_CLAIM",
    topic: "",
    status: "DRAFT",
    scheduledAt: null,
    sentAt: null,
    delivered: 0,
    failed: 0,
    createdBy: "ops",
    updatedAt: "2026-08-03 11:05",
  },
  {
    id: "push_names_frames",
    title: "New Stylish Name frames",
    body: "Premium wraps just landed. Try them in Names.",
    deepLink: "ffops://names",
    audience: "TOPIC",
    topic: "feature_names",
    status: "SCHEDULED",
    scheduledAt: "2026-08-05 12:00",
    sentAt: null,
    delivered: 0,
    failed: 0,
    createdBy: "admin",
    updatedAt: "2026-08-01 14:22",
  },
  {
    id: "push_shop_restock",
    title: "Coin shop restock",
    body: "Starter packs are back — limited inventory.",
    deepLink: "ffops://shop",
    audience: "ALL",
    topic: "",
    status: "FAILED",
    scheduledAt: "2026-08-02 08:00",
    sentAt: "2026-08-02 08:01",
    delivered: 420,
    failed: 8901,
    createdBy: "admin",
    updatedAt: "2026-08-02 08:05",
  },
  {
    id: "push_july_wrap",
    title: "July season wrap",
    body: "Thanks for playing — rewards summary inside.",
    deepLink: "ffops://home",
    audience: "ACTIVE_7D",
    topic: "",
    status: "CANCELLED",
    scheduledAt: "2026-07-31 20:00",
    sentAt: null,
    delivered: 0,
    failed: 0,
    createdBy: "ops",
    updatedAt: "2026-07-31 19:10",
  },
];

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
  if (values.audience === "TOPIC" && !values.topic.trim()) {
    return { error: "Topic is required for FCM topic audience." };
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
