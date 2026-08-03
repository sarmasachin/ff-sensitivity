"use client";

import Link from "next/link";
import {
  NOTIFICATION_KIND_STYLE,
  type OpsNotification,
} from "./notifications-data";

type Props = {
  items: OpsNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
};

export function OpsNotificationsPanel({
  items,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: Props) {
  const unread = items.filter((n) => !n.read).length;

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="absolute top-[calc(100%+8px)] right-0 z-50 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#eef2f7] px-4 py-3">
        <div>
          <p className="text-[14px] font-semibold text-[#0f172a]">
            Notifications
          </p>
          <p className="text-[12px] text-[#94a3b8]">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={unread === 0}
          className="text-[12px] font-semibold text-sky-700 hover:text-sky-900 disabled:cursor-default disabled:text-slate-300"
        >
          Mark all read
        </button>
      </div>

      <ul className="max-h-[min(70vh,420px)] overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-4 py-10 text-center text-[13px] text-slate-400">
            No notifications yet.
          </li>
        ) : (
          items.map((item) => {
            const kind = NOTIFICATION_KIND_STYLE[item.kind];
            return (
              <li
                key={item.id}
                className={[
                  "border-b border-[#f1f5f9] last:border-0",
                  item.read ? "bg-white" : "bg-sky-50/40",
                ].join(" ")}
              >
                <Link
                  href={item.href}
                  onClick={() => {
                    onMarkRead(item.id);
                    onClose();
                  }}
                  className="block px-4 py-3.5 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${kind.className}`}
                    >
                      {kind.label}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] font-semibold text-slate-900">
                    {!item.read ? (
                      <span
                        aria-hidden
                        className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-sky-500 align-middle"
                      />
                    ) : null}
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                    {item.body}
                  </p>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
