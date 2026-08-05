"use client";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  body: string;
};

export function ProfileToggle({ checked, onChange, title, body }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
        checked
          ? "border-indigo-200 bg-indigo-50/60"
          : "border-slate-200/90 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors",
          checked ? "bg-indigo-600" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          ].join(" ")}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-slate-900">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-slate-500">
          {body}
        </span>
      </span>
    </button>
  );
}
