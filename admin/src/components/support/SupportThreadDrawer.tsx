"use client";

import { useEffect, useState } from "react";
import {
  SUPPORT_STATUS_LABEL,
  SUPPORT_SUBJECT_LABEL,
  type SupportThreadRow,
} from "./support-data";

type Props = {
  open: boolean;
  row: SupportThreadRow | null;
  busy?: boolean;
  onClose: () => void;
  onReply: (id: string, text: string) => void;
  onMarkRead: (id: string) => void;
  onDeleteUserMessage: (threadId: string, messageId: string) => void;
  onDeleteThread: (id: string) => void;
};

export function SupportThreadDrawer({
  open,
  row,
  busy = false,
  onClose,
  onReply,
  onMarkRead,
  onDeleteUserMessage,
  onDeleteThread,
}: Props) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open || !row) return;
    setDraft("");
  }, [open, row?.id]);

  useEffect(() => {
    if (!open || !row?.id || !row.unread) return;
    onMarkRead(row.id);
  }, [open, row?.id, row?.unread, onMarkRead]);

  if (!open || !row) return null;

  function submit() {
    const text = draft.trim();
    if (!text || !row || busy) return;
    onReply(row.id, text);
    setDraft("");
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-sky-700 uppercase">
              Thread
            </p>
            <h2 className="mt-1 truncate text-[18px] font-bold tracking-[-0.02em] text-slate-900">
              {row.name}
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-slate-500">
              {row.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Subject
              </p>
              <p className="mt-0.5 font-semibold text-slate-900">
                {SUPPORT_SUBJECT_LABEL[row.subject]}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Status
              </p>
              <p className="mt-0.5 font-semibold text-slate-900">
                {SUPPORT_STATUS_LABEL[row.status]}
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Device
              </p>
              <p className="mt-0.5 font-medium text-slate-800">
                {row.deviceLabel} · v{row.appVersion}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {row.messages.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[12px] text-slate-400">
                No messages left in this thread.
              </p>
            ) : (
              row.messages.map((msg) => {
                const admin = msg.sender === "ADMIN";
                return (
                  <div
                    key={msg.id}
                    className={[
                      "group rounded-xl border px-3.5 py-3",
                      admin
                        ? "ml-4 border-sky-200 bg-sky-50/70"
                        : "mr-4 border-slate-200 bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                        {admin ? "Staff" : "User"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] tabular-nums text-slate-400">
                          {msg.createdAt}
                        </span>
                        {!admin ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onDeleteUserMessage(row.id, msg.id)}
                            title="Delete this message"
                            aria-label="Delete this message"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:text-rose-600 disabled:opacity-40 md:opacity-0 md:group-hover:opacity-100"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden
                            >
                              <path
                                d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-8 0v11.5A1.5 1.5 0 0 0 8.5 20h7a1.5 1.5 0 0 0 1.5-1.5V7"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-800">
                      {msg.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <footer className="space-y-3 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDeleteThread(row.id)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-[12px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-8 0v11.5A1.5 1.5 0 0 0 8.5 20h7a1.5 1.5 0 0 0 1.5-1.5V7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Delete conversation
          </button>

          {row.status === "CLOSED" ? (
            <p className="text-[12px] text-slate-500">
              Thread closed. You can still delete messages or remove the whole
              conversation.
            </p>
          ) : (
            <>
              <label className="block text-[11px] font-semibold text-slate-600">
                Reply as staff
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  disabled={busy}
                  placeholder="Write a clear, professional reply…"
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:opacity-50"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!draft.trim() || busy}
                  onClick={submit}
                  className="h-9 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Send reply
                </button>
              </div>
            </>
          )}
        </footer>
      </aside>
    </div>
  );
}
