"use client";

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  body: string;
  danger?: boolean;
};

export function AppControlToggle({
  checked,
  onChange,
  title,
  body,
  danger,
}: Props) {
  return (
    <label
      className={[
        "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3",
        danger && checked
          ? "border-rose-200 bg-rose-50/60 hover:border-rose-300"
          : "border-slate-100 bg-white/80 hover:border-emerald-200",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={[
          "mt-0.5 h-4 w-4 rounded border-slate-300 focus:ring-emerald-500/40",
          danger ? "text-rose-700" : "text-emerald-700",
        ].join(" ")}
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
