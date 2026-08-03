"use client";

import { useMemo, useState } from "react";
import {
  REDEEM_COMMENT_DEMO,
  type RedeemCommentRow,
} from "./redeem-comments-data";
import {
  IconEye,
  IconEyeOff,
  IconTrash,
  actionBtn,
} from "./RedeemActionIcons";

type Props = {
  open: boolean;
  codeId: string | null;
  codeTitle: string;
  onClose: () => void;
};

export function RedeemCommentsDrawer({
  open,
  codeId,
  codeTitle,
  onClose,
}: Props) {
  const [rows, setRows] = useState<RedeemCommentRow[]>(() => [
    ...REDEEM_COMMENT_DEMO,
  ]);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [notice, setNotice] = useState<string | null>(null);

  const forCode = useMemo(
    () => (codeId ? rows.filter((r) => r.codeId === codeId) : []),
    [rows, codeId],
  );

  const visible = useMemo(() => {
    if (filter === "visible") return forCode.filter((r) => !r.isHidden);
    if (filter === "hidden") return forCode.filter((r) => r.isHidden);
    return forCode;
  }, [forCode, filter]);

  if (!open || !codeId) return null;

  function toggleHide(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const nextHidden = !row.isHidden;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isHidden: nextHidden } : r)),
    );
    setNotice(
      nextHidden
        ? `Hidden comment from ${row.author}.`
        : `Unhidden comment from ${row.author}.`,
    );
  }

  function remove(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (!window.confirm(`Delete comment by ${row.author}?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setNotice(`Deleted comment by ${row.author}.`);
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        aria-label="Close comments"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl ring-1 ring-slate-200">
        <header className="shrink-0 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-indigo-600 uppercase">
                Comments
              </p>
              <h2 className="mt-1 truncate text-[16px] font-bold text-slate-900">
                {codeTitle}
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                {forCode.length} total · {forCode.filter((r) => r.isHidden).length}{" "}
                hidden
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
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
          </div>

          <div className="mt-3 flex gap-1.5">
            {(
              [
                ["all", "All"],
                ["visible", "Visible"],
                ["hidden", "Hidden"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={[
                  "h-8 rounded-lg px-3 text-[12px] font-medium",
                  filter === id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {notice ? (
          <p className="shrink-0 border-b border-amber-100 bg-amber-50 px-5 py-2 text-[12px] text-amber-900">
            {notice}
          </p>
        ) : null}

        <div className="ops-scroll-hide min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-400">
              No comments in this filter.
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900">
                        {row.author}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {row.createdLabel} · {row.likes} likes
                      </p>
                    </div>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        row.isHidden
                          ? "bg-slate-200 text-slate-600"
                          : "bg-emerald-100 text-emerald-800",
                      ].join(" ")}
                    >
                      {row.isHidden ? "Hidden" : "Visible"}
                    </span>
                  </div>
                  <p
                    className={[
                      "mt-2 text-[13px] leading-relaxed text-slate-600",
                      row.isHidden ? "line-through opacity-60" : "",
                    ].join(" ")}
                  >
                    {row.body}
                  </p>
                  <div className="mt-3 flex gap-1">
                    <button
                      type="button"
                      onClick={() => toggleHide(row.id)}
                      className={actionBtn.hide}
                      aria-label={row.isHidden ? "Unhide" : "Hide"}
                      title={row.isHidden ? "Unhide" : "Hide"}
                    >
                      {row.isHidden ? <IconEye /> : <IconEyeOff />}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      className={actionBtn.delete}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
