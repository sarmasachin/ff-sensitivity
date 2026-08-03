"use client";

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  body: string;
};

export function SettingsToggle({ checked, onChange, title, body }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-white/80 px-3.5 py-3 hover:border-orange-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-700 focus:ring-orange-500/40"
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
