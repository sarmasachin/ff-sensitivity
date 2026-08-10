type Props = {
  total: number;
  scheduled: number;
  drafts: number;
  sent: number;
  devicesDelivered: number;
  devicesFailed: number;
};

function Stat({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string | number;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e8eaee] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
        {label}
      </p>
      <p
        className={[
          "mt-1 text-[22px] font-bold tracking-[-0.03em] tabular-nums",
          valueClassName ?? "text-slate-900",
        ].join(" ")}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[12px] text-slate-500">{hint}</p>
    </div>
  );
}

export function PushStats({
  total,
  scheduled,
  drafts,
  sent,
  devicesDelivered,
  devicesFailed,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Stat label="Campaigns" value={total} hint="All FCM jobs" />
      <Stat label="Drafts" value={drafts} hint="Not sent yet" />
      <Stat label="Scheduled" value={scheduled} hint="Queued sends" />
      <Stat label="Sent jobs" value={sent} hint="Campaigns completed" />
      <Stat
        label="Devices delivered"
        value={devicesDelivered.toLocaleString()}
        hint="FCM accepted on device tokens"
        valueClassName="text-emerald-700"
      />
      <Stat
        label="Devices failed"
        value={devicesFailed.toLocaleString()}
        hint="Invalid / unreachable tokens"
        valueClassName={devicesFailed > 0 ? "text-rose-700" : "text-slate-900"}
      />
    </div>
  );
}
