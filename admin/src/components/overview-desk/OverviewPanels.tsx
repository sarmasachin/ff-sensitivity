import Link from "next/link";
import type { OverviewDevices, OverviewToday, OverviewUsers } from "./overview-data";
import { formatCompact } from "./overview-data";

type Props = {
  users: OverviewUsers;
  devices: OverviewDevices;
  today: OverviewToday;
  staleHours: number;
};

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <span className="text-[13px] text-slate-600">{label}</span>
      <span
        className={`text-[13px] font-semibold tabular-nums ${tone ?? "text-slate-900"}`}
      >
        {value}
      </span>
    </li>
  );
}

export function OverviewPanels({
  users,
  devices,
  today,
  staleHours,
}: Props) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-emerald-700/70 uppercase">
              Accounts
            </p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
              Users
            </h2>
          </div>
          <Link
            href="/users"
            className="text-[12px] font-semibold text-sky-700 hover:text-sky-900"
          >
            Open →
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-slate-100">
          <Row label="Total" value={formatCompact(users.total)} />
          <Row label="Active" value={users.active} tone="text-emerald-700" />
          <Row
            label="Restricted"
            value={users.restricted}
            tone="text-amber-700"
          />
          <Row
            label="Suspended"
            value={users.suspended}
            tone="text-rose-700"
          />
          <Row label="New today (UTC)" value={users.newToday} />
          <Row label="New 7d" value={users.new7d} />
          <Row label="Logged in 7d" value={users.loggedIn7d} />
        </ul>
      </section>

      <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-sky-700/70 uppercase">
              Registry
            </p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
              Devices
            </h2>
          </div>
          <Link
            href="/devices"
            className="text-[12px] font-semibold text-sky-700 hover:text-sky-900"
          >
            Open →
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-slate-100">
          <Row label="Total installs" value={formatCompact(devices.total)} />
          <Row
            label={`Active (${staleHours}h)`}
            value={devices.active72h}
            tone="text-emerald-700"
          />
          <Row label="Stale" value={devices.stale} tone="text-amber-700" />
          <Row label="Blocked" value={devices.blocked} tone="text-rose-700" />
          <Row label="Push active 7d" value={devices.pushActive7d} />
        </ul>
      </section>

      <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-indigo-700/70 uppercase">
              UTC today
            </p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
              Activity pulse
            </h2>
          </div>
          <Link
            href="/claims"
            className="text-[12px] font-semibold text-sky-700 hover:text-sky-900"
          >
            Claims →
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-slate-100">
          <Row label="Claims" value={today.claims} />
          <Row label="Scratch rolls" value={today.scratch} />
          <Row
            label="Wallet net"
            value={formatCompact(today.walletNet)}
            tone="text-teal-700"
          />
          <Row
            label="Pending support"
            value={today.pendingSupport}
            tone="text-rose-700"
          />
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/scratch"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white"
          >
            Scratch
          </Link>
          <Link
            href="/wallets"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white"
          >
            Wallets
          </Link>
          <Link
            href="/support"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white"
          >
            Support
          </Link>
        </div>
      </section>
    </div>
  );
}
