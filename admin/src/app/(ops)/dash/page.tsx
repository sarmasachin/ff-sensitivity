"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { fetchDashSnapshot } from "@/components/dashboard-desk/dashboard-api";
import {
  DASH_RANGE_TABS,
  emptyDashSnapshot,
  type DashRangeId,
  type DashSnapshot,
} from "@/components/dashboard-desk/dashboard-data";
import { formatRefreshedLabel } from "@/components/overview-desk/overview-data";
import { ApiClientError } from "@/lib/api";

export default function DashboardLivePage() {
  const [range, setRange] = useState<DashRangeId>("7d");
  const [snapshot, setSnapshot] = useState<DashSnapshot>(emptyDashSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestId = useRef(0);

  const rangeLabel =
    DASH_RANGE_TABS.find((tab) => tab.id === range)?.label ?? "7 days";

  const load = useCallback(
    async (nextRange: DashRangeId, quiet = false) => {
      const token = ++requestId.current;
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const next = await fetchDashSnapshot(nextRange);
        if (token !== requestId.current) return;
        setSnapshot(next);
        if (quiet) {
          setNotice(`Refreshed · ${formatRefreshedLabel(next.refreshedAt)}`);
        }
      } catch (e) {
        if (token !== requestId.current) return;
        const message =
          e instanceof ApiClientError
            ? e.message
            : "Could not load the dashboard.";
        setError(message);
      } finally {
        if (token === requestId.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(range);
  }, [load, range]);

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <DashboardHeader
        refreshedAt={
          loading && !snapshot.refreshedAt
            ? "Loading…"
            : formatRefreshedLabel(snapshot.refreshedAt)
        }
        onRefresh={() => void load(range, true)}
      />
      <DashboardStats kpis={snapshot.kpis} rangeLabel={rangeLabel} />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-950"
        >
          {error}
        </div>
      ) : null}

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
        <DashboardTrendCard points={snapshot.trend} rangeLabel={rangeLabel} />
        <DashboardClaimsDonut
          slices={snapshot.claimsMix}
          rangeLabel={rangeLabel}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardInventoryCard rows={snapshot.inventory} />
        <DashboardWalletCard days={snapshot.wallet} rangeLabel={rangeLabel} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardSupportCard rows={snapshot.support} />
        <DashboardActivityCard rows={snapshot.activity} />
      </div>

      <DashboardCapabilities />
    </section>
  );
}
