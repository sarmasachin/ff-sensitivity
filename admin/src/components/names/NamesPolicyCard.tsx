"use client";

import type { NamesPolicy } from "./names-data";

type Props = {
  policy: NamesPolicy;
  onChange: (next: NamesPolicy) => void;
  onSave: () => void;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

function Toggle({
  checked,
  onChange,
  title,
  body,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  body: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-white/80 px-3.5 py-3 hover:border-teal-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
      />
      <span>
        <span className="block text-[13px] font-semibold text-slate-900">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] text-slate-500">{body}</span>
      </span>
    </label>
  );
}

export function NamesPolicyCard({ policy, onChange, onSave }: Props) {
  function patch(partial: Partial<NamesPolicy>) {
    onChange({ ...policy, ...partial });
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-teal-700 uppercase">
        Limits
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        FF name policy & remote packs
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Matches Android Stylish Names defaults (12-char FF limit, 100-style
        batches). Remote pack URL is prepared for Nest sync later.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-[11px] font-semibold text-slate-600">
          Max name characters
          <input
            type="number"
            min={1}
            max={24}
            className={fieldClass}
            value={policy.maxNameChars}
            onChange={(e) =>
              patch({
                maxNameChars: Math.max(
                  1,
                  Math.min(24, Number(e.target.value) || 12),
                ),
              })
            }
          />
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">
          Max batch size
          <input
            type="number"
            min={10}
            max={500}
            className={fieldClass}
            value={policy.maxBatchSize}
            onChange={(e) =>
              patch({
                maxBatchSize: Math.max(
                  10,
                  Math.min(500, Number(e.target.value) || 100),
                ),
              })
            }
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <Toggle
          checked={policy.blockSpaces}
          onChange={(v) => patch({ blockSpaces: v })}
          title="Block spaces in input"
          body="Android strips whitespace from the base name."
        />
        <Toggle
          checked={policy.requireStyleWrap}
          onChange={(v) => patch({ requireStyleWrap: v })}
          title="Always stylish wrap"
          body="Never show plain name alone — always framed / decorated."
        />
        <Toggle
          checked={policy.remotePackEnabled}
          onChange={(v) => patch({ remotePackEnabled: v })}
          title="Remote pack sync"
          body="When API is ready, pull symbol/frame packs from URL."
        />
      </div>

      <label className="mt-4 block text-[11px] font-semibold text-slate-600">
        Remote pack URL
        <input
          type="url"
          className={fieldClass}
          placeholder="https://…"
          value={policy.remotePackUrl}
          disabled={!policy.remotePackEnabled}
          onChange={(e) => patch({ remotePackUrl: e.target.value })}
        />
      </label>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          className="h-10 rounded-xl bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800"
        >
          Save policy
        </button>
      </div>
    </section>
  );
}
