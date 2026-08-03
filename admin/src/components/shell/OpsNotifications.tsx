"use client";

import { useEffect, useRef, useState } from "react";
import {
  OPS_NOTIFICATION_SEED,
  countUnread,
  type OpsNotification,
} from "./notifications-data";
import { OpsNotificationsPanel } from "./OpsNotificationsPanel";

export function OpsNotifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OpsNotification[]>(() =>
    OPS_NOTIFICATION_SEED.map((n) => ({ ...n })),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = countUnread(items);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function markRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={[
          "relative flex h-10 w-10 items-center justify-center rounded-full text-[#64748b] hover:bg-[#eef2f7]",
          open ? "bg-[#eef2f7] text-[#0f172a]" : "",
        ].join(" ")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M10 18.5a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        {unread > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[9px] font-bold text-white tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <OpsNotificationsPanel
          items={items}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
