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

export const SUPPORT_DEMO_ROWS: SupportThreadRow[] = [
  {
    id: "sup_01",
    name: "Arjun K",
    email: "arjun.k@mail.test",
    subject: "REDEEM_CODE_ISSUE",
    status: "PENDING_REPLY",
    appVersion: "2.4.1",
    deviceLabel: "Pixel 7 · Android 14",
    createdAt: "2026-08-03 09:12",
    updatedAt: "2026-08-03 09:14",
    unread: true,
    messages: [
      {
        id: "m1",
        sender: "USER",
        text: "Redeem code unlocks but Copy does nothing. Claim never appears.",
        createdAt: "2026-08-03 09:12",
      },
      {
        id: "m2",
        sender: "USER",
        text: "Tried twice on Wi‑Fi and mobile data.",
        createdAt: "2026-08-03 09:14",
      },
    ],
  },
  {
    id: "sup_02",
    name: "Neha S",
    email: "neha.s@mail.test",
    subject: "BUG",
    status: "OPEN",
    appVersion: "2.4.0",
    deviceLabel: "Samsung A54 · Android 13",
    createdAt: "2026-08-02 18:40",
    updatedAt: "2026-08-02 18:40",
    unread: true,
    messages: [
      {
        id: "m1",
        sender: "USER",
        text: "Daily Challenge quiz countdown freezes after wrong answer.",
        createdAt: "2026-08-02 18:40",
      },
    ],
  },
  {
    id: "sup_03",
    name: "Vikram R",
    email: "vikram.r@mail.test",
    subject: "FEATURE",
    status: "REPLIED",
    appVersion: "2.4.1",
    deviceLabel: "OnePlus 11 · Android 14",
    createdAt: "2026-08-01 11:05",
    updatedAt: "2026-08-01 15:22",
    unread: false,
    messages: [
      {
        id: "m1",
        sender: "USER",
        text: "Can we export sensitivity presets as a shareable link?",
        createdAt: "2026-08-01 11:05",
      },
      {
        id: "m2",
        sender: "ADMIN",
        text: "Thanks — shareable links are on the roadmap for next release.",
        createdAt: "2026-08-01 15:22",
      },
    ],
  },
  {
    id: "sup_04",
    name: "Priya M",
    email: "priya.m@mail.test",
    subject: "REPORT",
    status: "PENDING_REPLY",
    appVersion: "2.3.9",
    deviceLabel: "Redmi Note 12 · Android 13",
    createdAt: "2026-07-31 21:18",
    updatedAt: "2026-07-31 21:20",
    unread: true,
    messages: [
      {
        id: "m1",
        sender: "USER",
        text: "Community post with fake FF ID spam — please remove.",
        createdAt: "2026-07-31 21:18",
      },
    ],
  },
  {
    id: "sup_05",
    name: "Omar H",
    email: "omar.h@mail.test",
    subject: "FEEDBACK",
    status: "CLOSED",
    appVersion: "2.4.1",
    deviceLabel: "iQOO Neo · Android 14",
    createdAt: "2026-07-28 08:02",
    updatedAt: "2026-07-29 10:11",
    unread: false,
    messages: [
      {
        id: "m1",
        sender: "USER",
        text: "Names studio looks good. Font filter could be sticky.",
        createdAt: "2026-07-28 08:02",
      },
      {
        id: "m2",
        sender: "ADMIN",
        text: "Appreciate the note — logged for UX polish.",
        createdAt: "2026-07-29 10:11",
      },
    ],
  },
  {
    id: "sup_06",
    name: "Sara L",
    email: "sara.l@mail.test",
    subject: "OTHER",
    status: "OPEN",
    appVersion: "2.4.1",
    deviceLabel: "Motorola G84 · Android 14",
    createdAt: "2026-08-03 07:55",
    updatedAt: "2026-08-03 07:55",
    unread: true,
    messages: [
      {
        id: "m1",
        sender: "USER",
        text: "Account deleted request — remove my shared cards please.",
        createdAt: "2026-08-03 07:55",
      },
    ],
  },
  {
    id: "sup_07",
    name: "Dev Team",
    email: "qa.bot@mail.test",
    subject: "BUG",
    status: "REPLIED",
    appVersion: "2.4.1-debug",
    deviceLabel: "Emulator · API 34",
    createdAt: "2026-08-02 12:00",
    updatedAt: "2026-08-02 16:40",
    unread: false,
    messages: [
      {
        id: "m1",
        sender: "USER",
        text: "Scratch foil layer sometimes stays after claim on slow devices.",
        createdAt: "2026-08-02 12:00",
      },
      {
        id: "m2",
        sender: "ADMIN",
        text: "Reproduced — fix queued in next build.",
        createdAt: "2026-08-02 16:40",
      },
    ],
  },
  {
    id: "sup_08",
    name: "Karan P",
    email: "karan.p@mail.test",
    subject: "REDEEM_CODE_ISSUE",
    status: "CLOSED",
    appVersion: "2.4.0",
    deviceLabel: "Vivo V29 · Android 14",
    createdAt: "2026-07-25 19:33",
    updatedAt: "2026-07-26 09:01",
    unread: false,
    messages: [
      {
        id: "m1",
        sender: "USER",
        text: "Code already claimed by another device in my house.",
        createdAt: "2026-07-25 19:33",
      },
      {
        id: "m2",
        sender: "ADMIN",
        text: "Policy is one claim per code. Closed after confirmation.",
        createdAt: "2026-07-26 09:01",
      },
    ],
  },
];

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
    body: "Threads from Android Contact Us — report, redeem issues, bugs, features, feedback.",
  },
  {
    title: "Staff reply",
    body: "Open a thread and send an admin reply. Status moves to Replied automatically.",
  },
  {
    title: "Triage",
    body: "Filter by subject and status. Mark unread / close when resolved.",
  },
  {
    title: "Device context",
    body: "App version and device label travel with each ticket for faster debugging.",
  },
] as const;
