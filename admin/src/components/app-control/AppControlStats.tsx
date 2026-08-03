type Props = {
  featuresOn: number;
  featuresOff: number;
  navOn: number;
  maintenance: boolean;
  minVersion: string;
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

export function AppControlStats({
  featuresOn,
  featuresOff,
  navOn,
  maintenance,
  minVersion,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Stat label="Features on" value={featuresOn} hint="Kill-switches live" />
      <Stat label="Features off" value={featuresOff} hint="Hard-disabled" />
      <Stat label="Nav visible" value={navOn} hint="Home + drawer" />
      <Stat
        label="Maintenance"
        value={maintenance ? "On" : "Off"}
        hint={maintenance ? "App gated" : "Normal traffic"}
      />
      <Stat label="Min version" value={minVersion} hint="Force / soft gate" />
    </div>
  );
}
