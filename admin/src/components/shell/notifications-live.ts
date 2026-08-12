import {
  SUPPORT_SUBJECT_LABEL,
  type SupportThreadRow,
} from "@/components/support/support-data";
import type { OpsNotification } from "./notifications-data";

export function supportThreadIdFromNotification(id: string): string | null {
  return id.startsWith("support:") ? id.slice("support:".length) : null;
}

export function notificationsFromSupport(
  threads: SupportThreadRow[],
): OpsNotification[] {
  return threads
    .slice()
    .sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    })
    .slice(0, 20)
    .map((thread) => ({
      id: `support:${thread.id}`,
      kind: "support" as const,
      title: `Support · ${SUPPORT_SUBJECT_LABEL[thread.subject] ?? thread.subject}`,
      body: [thread.name, thread.deviceLabel].filter(Boolean).join(" · "),
      time: thread.updatedAt,
      href: "/support",
      read: !thread.unread,
    }));
}
