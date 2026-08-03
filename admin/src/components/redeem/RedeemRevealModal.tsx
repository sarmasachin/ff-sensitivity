"use client";

type Props = {
  open: boolean;
  title: string;
  code: string;
  onClose: () => void;
};

export function RedeemRevealModal({ open, title, code, onClose }: Props) {
  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#0f172a]/45"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-violet-600 uppercase">
          Reveal code
        </p>
        <h2 className="mt-1 text-[16px] font-bold text-[#0f172a]">{title}</h2>
        <p className="mt-3 rounded-xl bg-violet-50 px-3 py-3 font-mono text-[14px] tracking-wide text-violet-950 break-all">
          {code}
        </p>
        <p className="mt-2 text-[11px] text-[#94a3b8]">
          Local reveal only — audit log comes with API.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={copy}
            className="h-10 rounded-xl border border-violet-200 bg-violet-50 px-4 text-[13px] font-semibold text-violet-700"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl bg-[#0f172a] px-4 text-[13px] font-semibold text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
