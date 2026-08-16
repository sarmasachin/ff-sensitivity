import type { SupportThreadRow } from "./support-data";

export type SupportPendingAction =
  | { kind: "close"; threadId: string }
  | { kind: "delete-thread"; threadId: string }
  | { kind: "delete-message"; threadId: string; messageId: string };

export function supportConfirmCopy(
  pending: SupportPendingAction,
  row: SupportThreadRow,
) {
  const who = `${row.name} · ${row.email}`;
  if (pending.kind === "close") {
    return {
      tone: "neutral" as const,
      eyebrow: "Close thread",
      title: "Mark this conversation resolved?",
      description:
        "The user can no longer reply in this thread. They can still start a new conversation from the app.",
      detail: who,
      note: undefined as string | undefined,
      confirmLabel: "Close thread",
      busyLabel: "Closing…",
    };
  }
  if (pending.kind === "delete-thread") {
    return {
      tone: "danger" as const,
      eyebrow: "Delete conversation",
      title: "Permanently delete this conversation?",
      description:
        "The whole thread and every message inside it will be removed from the support inbox.",
      detail: who,
      note: "This cannot be undone. The action is recorded in the audit log.",
      confirmLabel: "Delete forever",
      busyLabel: "Deleting…",
    };
  }
  const target = row.messages.find((m) => m.id === pending.messageId);
  return {
    tone: "danger" as const,
    eyebrow: "Delete message",
    title: "Delete this user message?",
    description:
      "Only this single message is removed. The rest of the conversation stays intact.",
    detail: target ? `“${target.text.slice(0, 140)}”` : who,
    note: "This cannot be undone. The action is recorded in the audit log.",
    confirmLabel: "Delete message",
    busyLabel: "Deleting…",
  };
}
