"use client";

import { useMemo, useState } from "react";
import { DashboardActivityCard } from "@/components/dashboard-desk/DashboardActivityCard";
import { DashboardCapabilities } from "@/components/dashboard-desk/DashboardCapabilities";
import { DashboardClaimsDonut } from "@/components/dashboard-desk/DashboardClaimsDonut";
import { DashboardHeader } from "@/components/dashboard-desk/DashboardHeader";
import { DashboardInventoryCard } from "@/components/dashboard-desk/DashboardInventoryCard";
import { DashboardRangeTabs } from "@/components/dashboard-desk/DashboardRangeTabs";
import { DashboardStats } from "@/components/dashboard-desk/DashboardStats";
import { DashboardSupportCard } from "@/components/dashboard-desk/DashboardSupportCard";
import { DashboardTrendCard } from "@/components/dashboard-desk/DashboardTrendCard";
import { DashboardWalletCard } from "@/components/dashboard-desk/DashboardWalletCard";
import {
  DASH_RANGE_TABS,
  buildDashSnapshot,
  type DashRangeId,
} from "@/components/dashboard-desk/dashboard-data";

export default function DashboardLivePage() {
  const [range, setRange] = useState<DashRangeId>("7d");
  const [tick, setTick] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const snapshot = useMemo(() => {
    void tick;
    return buildDashSnapshot(range);
  }, [range, tick]);

  const rangeLabel =
    DASH_RANGE_TABS.find((t) => t.id === range)?.label ?? "7 days";

  function refresh() {
    setTick((n) => n + 1);
    setNotice(`Snapshot refreshed (local demo) · range ${rangeLabel}.`);
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <DashboardHeader
        refreshedAt={snapshot.refreshedAt}
        onRefresh={refresh}
      />
      <DashboardStats kpis={snapshot.kpis} rangeLabel={rangeLabel} />

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-[13px] font-medium text-sky-950"
        >
          {notice}
        </div>
      ) : null}

      <DashboardRangeTabs active={range} onChange={setRange} />

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardTrendCard
          points={snapshot.trend}
          rangeLabel={rangeLabel}
        />
        <DashboardClaimsDonut
          slices={snapshot.claimsMix}
          rangeLabel={rangeLabel}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardInventoryCard rows={snapshot.inventory} />
        <DashboardWalletCard
          days={snapshot.wallet}
          rangeLabel={rangeLabel}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardSupportCard rows={snapshot.support} />
        <DashboardActivityCard rows={snapshot.activity} />
      </div>

      <DashboardCapabilities />
    </section>
  );
}
