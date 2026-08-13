import { SAFE_SCRATCH_TIP } from "./redeem-data";

type Props = {
  mode: "SINGLE" | "SCRATCH_REWARD";
  onPick: (mode: "SINGLE" | "SCRATCH_REWARD") => void;
};

export function RedeemModeChooser({ mode, onPick }: Props) {
  const scratch = mode === "SCRATCH_REWARD";
  return (
    <>
      <p className="mb-1 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
        Card type
      </p>
      <div className="mb-2 grid gap-1.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPick("SINGLE")}
          className={[
            "rounded-lg border px-2.5 py-1.5 text-left",
            !scratch
              ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
              : "border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ")}
        >
          <p className="text-[12px] font-semibold text-slate-900">Single code</p>
          <p className="text-[10px] text-slate-500">1 secret · 1 winner</p>
        </button>
        <button
          type="button"
          onClick={() => onPick("SCRATCH_REWARD")}
          className={[
            "rounded-lg border px-2.5 py-1.5 text-left",
            scratch
              ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
              : "border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ")}
        >
          <p className="text-[12px] font-semibold text-slate-900">
            Scratch reward
          </p>
          <p className="text-[10px] text-slate-500">Coins + limited codes</p>
        </button>
      </div>
      {scratch ? (
        <p className="mb-2 text-[10px] leading-snug text-slate-500">
          {SAFE_SCRATCH_TIP}
        </p>
      ) : null}
    </>
  );
}
