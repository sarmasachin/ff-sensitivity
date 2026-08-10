"use client";

import { useEffect, useState } from "react";
import {
  formToCampaign,
  PUSH_DEEP_LINK_OPTIONS,
  type PushAudience,
  type PushCampaignRow,
  type PushFormValues,
} from "./push-data";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial: PushFormValues;
  existing: PushCampaignRow | null;
  onClose: () => void;
  onSave: (row: PushCampaignRow) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PushComposeModal({
  open,
  mode,
  initial,
  existing,
  onClose,
  onSave,
}: Props) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  function patch<K extends keyof PushFormValues>(
    key: K,
    value: PushFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = formToCampaign(
      values,
      `push_${Date.now().toString(36)}`,
      nowStamp(),
      existing,
    );
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onSave(result);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80 sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-cyan-800 uppercase">
              FCM
            </p>
            <h2 className="mt-0.5 text-[17px] font-bold text-slate-900">
              {mode === "add" ? "Compose campaign" : "Edit campaign"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
          <label className={labelClass}>
            ID
            <input
              className={`${fieldClass} font-mono`}
              value={values.id}
              onChange={(e) =>
                patch(
                  "id",
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "_")
                    .slice(0, 64),
                )
              }
              placeholder="push_challenge_open"
              disabled={mode === "edit"}
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">
              Optional. Only a-z, 0-9, underscore. Leave blank to auto-generate.
            </span>
          </label>
          <label className={labelClass}>
            Title
            <input
              className={fieldClass}
              value={values.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="Daily Challenge is live"
              required
              maxLength={65}
            />
          </label>
          <label className={labelClass}>
            Body
            <textarea
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              value={values.body}
              onChange={(e) => patch("body", e.target.value)}
              placeholder="Short tray copy for Android"
              required
              maxLength={180}
            />
          </label>
          <label className={labelClass}>
            Open in app (deep link)
            <select
              className={fieldClass}
              value={values.deepLink}
              onChange={(e) => patch("deepLink", e.target.value)}
              required
            >
              {!PUSH_DEEP_LINK_OPTIONS.some(
                (o) => `ffops://${o.path}` === values.deepLink,
              ) && values.deepLink ? (
                <option value={values.deepLink}>
                  {values.deepLink} (saved)
                </option>
              ) : null}
              {PUSH_DEEP_LINK_OPTIONS.map((opt) => (
                <option key={opt.path} value={`ffops://${opt.path}`}>
                  {opt.label} — ffops://{opt.path}
                </option>
              ))}
            </select>
            <span className="mt-1 block font-mono text-[11px] text-slate-500">
              {values.deepLink}
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Audience
              <select
                className={fieldClass}
                value={values.audience}
                onChange={(e) =>
                  patch("audience", e.target.value as PushAudience)
                }
              >
                <option value="ALL">All devices</option>
                <option value="ACTIVE_7D">Active 7 days</option>
                <option value="NO_CLAIM">No claim yet</option>
                <option value="TOPIC">FCM topic</option>
              </select>
            </label>
            <label className={labelClass}>
              Topic
              <input
                className={`${fieldClass} font-mono`}
                value={values.topic}
                onChange={(e) => patch("topic", e.target.value)}
                placeholder="feature_names"
                disabled={values.audience !== "TOPIC"}
              />
            </label>
          </div>
          <fieldset>
            <legend className={labelClass}>Schedule</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(
                [
                  ["draft", "Save draft"],
                  ["later", "Schedule"],
                  ["now", "Ready to send"],
                ] as const
              ).map(([id, label]) => {
                const on = values.scheduleMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patch("scheduleMode", id)}
                    className={[
                      "h-9 rounded-lg px-3 text-[12px] font-semibold",
                      on
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {values.scheduleMode === "later" ? (
            <label className={labelClass}>
              Send at
              <input
                className={`${fieldClass} font-mono`}
                value={values.scheduledAt}
                onChange={(e) => patch("scheduledAt", e.target.value)}
                placeholder="2026-08-04 10:00"
                required
              />
            </label>
          ) : null}
          {values.scheduleMode === "now" ? (
            <p className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-[12px] text-cyan-950">
              Saved as draft ready for Admin Send. Live FCM fire stays behind
              the Send action.
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-800">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-3.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-9 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800"
          >
            {mode === "add" ? "Save campaign" : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}
