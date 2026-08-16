/** Support admin — mirrors Android Contact Us threads. */

export type SupportSubject =
  | "REPORT"
  | "REDEEM_CODE_ISSUE"
  | "BUG"
  | "FEATURE"
  | "FEEDBACK"
  | "OTHER";

export type SupportStatus = "OPEN" | "PENDING_REPLY" | "REPLIED" | "CLOSED";

export type SupportSender = "USER" | "ADMIN";

export type SupportMessage = {
  id: string;
  sender: SupportSender;
  text: string;
  createdAt: string;
};

export type SupportThreadRow = {
  id: string;
  name: string;
  email: string;
  subject: SupportSubject;
  status: SupportStatus;
  appVersion: string;
  deviceLabel: string;
  createdAt: string;
  updatedAt: string;
  unread: boolean;
  messages: SupportMessage[];
};

export const SUPPORT_SUBJECT_LABEL: Record<SupportSubject, string> = {
  REPORT: "Report",
  REDEEM_CODE_ISSUE: "Redeem code issue",
  BUG: "Bug",
  FEATURE: "Feature",
  FEEDBACK: "Feedback",
  OTHER: "Other",
};

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  OPEN: "Open",
  PENDING_REPLY: "Awaiting staff",
  REPLIED: "Replied",
  CLOSED: "Closed",
};

export type SupportListQuery = {
  q?: string;
  status?: string;
  subject?: string;
  unread?: boolean;
};

export function supportListQuery(
  filter: "all" | "open" | "unread" | "replied" | "closed" | "bug" | "redeem",
  q: string,
): SupportListQuery {
  const opts: SupportListQuery = {};
  const query = q.trim();
  if (query) opts.q = query;
  if (filter === "open") opts.status = "open";
  if (filter === "replied") opts.status = "REPLIED";
  if (filter === "closed") opts.status = "CLOSED";
  if (filter === "unread") opts.unread = true;
  if (filter === "bug") opts.subject = "BUG";
  if (filter === "redeem") opts.subject = "REDEEM_CODE_ISSUE";
  return opts;
}

export function computeSupportStats(rows: SupportThreadRow[]) {
  const open = rows.filter(
    (r) => r.status === "OPEN" || r.status === "PENDING_REPLY",
  ).length;
  const unread = rows.filter((r) => r.unread).length;
  const replied = rows.filter((r) => r.status === "REPLIED").length;
  const closed = rows.filter((r) => r.status === "CLOSED").length;
  return {
    total: rows.length,
    open,
    unread,
    replied,
    closed,
  };
}

export function previewSnippet(row: SupportThreadRow): string {
  const last = row.messages[row.messages.length - 1];
  return last?.text ?? "";
}

export const SUPPORT_CAPABILITIES = [
  {
    title: "Contact inbox",
    body: "Live Nest threads from Android Contact Us — report, redeem issues, bugs, features, feedback.",
  },
  {
    title: "Staff reply",
    body: "Open a thread and send an admin reply via POST /api/v1/admin/support/:id/reply.",
  },
  {
    title: "Triage",
    body: "Filter by subject and status. Mark unread / close when resolved — ACL gated by support module.",
  },
  {
    title: "Delete controls",
    body: "Remove a single user message from the thread drawer, or permanently delete the whole conversation from the table or drawer.",
  },
  {
    title: "Device context",
    body: "App version and device label travel with each ticket for faster debugging.",
  },
] as const;
