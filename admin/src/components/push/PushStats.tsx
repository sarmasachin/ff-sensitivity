type Props = {
  total: number;
  scheduled: number;
  drafts: number;
  sent: number;
  failed: number;
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

export function PushStats({
  total,
  scheduled,
  drafts,
  sent,
  failed,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Stat label="Campaigns" value={total} hint="All FCM jobs" />
      <Stat label="Scheduled" value={scheduled} hint="Queued sends" />
      <Stat label="Drafts" value={drafts} hint="Not sent yet" />
      <Stat label="Sent" value={sent} hint="Completed jobs" />
      <Stat label="Failed" value={failed} hint="Need retry" />
    </div>
  );
}
