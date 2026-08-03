import Link from "next/link";

type Card = {
  title: string;
  value: string;
  badge: string;
  badgeTone: "live" | "pending" | "role";
  icon: "shield" | "stack" | "user";
};

const CARDS: Card[] = [
  {
    title: "Authentication API",
    value: "Active",
    badge: "Live",
    badgeTone: "live",
    icon: "shield",
  },
  {
    title: "Redeem Inventory",
    value: "Disabled",
    badge: "Pending API",
    badgeTone: "pending",
    icon: "stack",
  },
  {
    title: "Active Admin Role",
    value: "Super Admin",
    badge: "Role",
    badgeTone: "role",
    icon: "user",
  },
];

const ROWS = [
  {
    name: "Auth Services",
    status: "Live",
    tone: "live" as const,
    action: { href: "/staff", label: "Open Staff" },
  },
  {
    name: "Redeem / Shop / Claims",
    status: "Connection Pending",
    tone: "pending" as const,
    action: { href: "/redeem", label: "Connect API" },
  },
  {
    name: "Challenge / Community / Support",
    status: "Connection Pending",
    tone: "pending" as const,
    action: { href: "/daily-challenge", label: "Connect API" },
  },
  {
    name: "App toggles / Ads / Push",
    status: "Connection Pending",
    tone: "pending" as const,
    action: { href: "/app", label: "Connect API" },
  },
];

export default function OverviewPage() {
  return (
    <section className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#0f172a]">
          Operations Console
        </h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#64748b]">
          Full remote control for the Android app: inventory, shop, community,
          challenge, support, ads, and feature switches. Connect each API to go
          live.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {CARDS.map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <CardIcon kind={card.icon} tone={card.badgeTone} />
              <Badge tone={card.badgeTone}>{card.badge}</Badge>
            </div>
            <p className="mt-4 text-[12px] font-medium tracking-[0.04em] text-[#94a3b8] uppercase">
              {card.title}
            </p>
            <p className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[#0f172a]">
              {card.value}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#eef2f7] px-5 py-4">
          <h2 className="text-[14px] font-semibold text-[#0f172a]">
            API Module Status Overview
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-[#eef2f7] text-[11px] font-semibold tracking-[0.08em] text-[#94a3b8] uppercase">
                <th className="px-5 py-3 font-semibold">Module Name</th>
                <th className="px-5 py-3 font-semibold">Integration Status</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.name} className="border-b border-[#f1f5f9] last:border-0">
                  <td className="px-5 py-4 text-[13px] font-medium text-[#0f172a]">
                    {row.name}
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={row.tone}>{row.status}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={row.action.href}
                      prefetch={false}
                      className="text-[13px] font-semibold text-[#2563eb] hover:underline"
                    >
                      {row.action.label}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "live" | "pending" | "role";
  children: string;
}) {
  const styles = {
    live: "bg-[#ecfdf5] text-[#15803d]",
    pending: "bg-[#fffbeb] text-[#b45309]",
    role: "bg-[#eff6ff] text-[#1d4ed8]",
  }[tone];
  const dot = {
    live: "bg-[#22c55e]",
    pending: "bg-[#f59e0b]",
    role: "bg-[#3b82f6]",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

function CardIcon({
  kind,
  tone,
}: {
  kind: "shield" | "stack" | "user";
  tone: "live" | "pending" | "role";
}) {
  const bg = {
    live: "bg-[#dbeafe] text-[#2563eb]",
    pending: "bg-[#f1f5f9] text-[#64748b]",
    role: "bg-[#ede9fe] text-[#7c3aed]",
  }[tone];

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
      {kind === "shield" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3 5 6v5c0 4.5 2.8 7.8 7 9 4.2-1.2 7-4.5 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      {kind === "stack" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="m4 8 8-4 8 4-8 4-8-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="m4 12 8 4 8-4M4 16l8 4 8-4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      ) : null}
      {kind === "user" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5.5 19c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      ) : null}
    </div>
  );
}
