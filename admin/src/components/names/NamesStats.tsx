type Props = {
  frames: number;
  liveFrames: number;
  premium: number;
  fonts: number;
  liveFonts: number;
};

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e8eaee] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[12px] text-slate-500">{hint}</p>
    </div>
  );
}

export function NamesStats({
  frames,
  liveFrames,
  premium,
  fonts,
  liveFonts,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Stat label="Frames" value={frames} hint="Total wraps" />
      <Stat label="Live frames" value={liveFrames} hint="Enabled for app" />
      <Stat label="Premium" value={premium} hint="Live premium set" />
      <Stat label="Fonts" value={fonts} hint="Letter maps" />
      <Stat label="Live fonts" value={liveFonts} hint="Active maps" />
    </div>
  );
}
