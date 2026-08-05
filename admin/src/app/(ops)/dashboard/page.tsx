"use client";

import { useCallback, useEffect, useState } from "react";
import { OverviewActivityChart } from "@/components/overview-desk/OverviewActivityChart";
import { OverviewCapabilities } from "@/components/overview-desk/OverviewCapabilities";
import { OverviewEngagementCard } from "@/components/overview-desk/OverviewEngagementCard";
import { OverviewFunnelCard } from "@/components/overview-desk/OverviewFunnelCard";
import { OverviewFunnelChart } from "@/components/overview-desk/OverviewFunnelChart";
import { OverviewHeader } from "@/components/overview-desk/OverviewHeader";
import { OverviewKpis } from "@/components/overview-desk/OverviewKpis";
import { OverviewPanels } from "@/components/overview-desk/OverviewPanels";
import { OverviewQualityCard } from "@/components/overview-desk/OverviewQualityCard";
import { OverviewQuickLinks } from "@/components/overview-desk/OverviewQuickLinks";
import { OverviewRangeTabs } from "@/components/overview-desk/OverviewRangeTabs";
import { OverviewScreensChart } from "@/components/overview-desk/OverviewScreensChart";
import { OverviewTrendCard } from "@/components/overview-desk/OverviewTrendCard";
import {
  fetchOverviewSeries,
  fetchOverviewSnapshot,
} from "@/components/overview-desk/overview-api";
import {
  OVERVIEW_RANGE_TABS,
  emptyOverviewSeries,
  emptyOverviewSnapshot,
  formatRefreshedLabel,
  type OverviewSeries,
  type OverviewSeriesRange,
  type OverviewSnapshot,
} from "@/components/overview-desk/overview-data";
import { ApiClientError } from "@/lib/api";

function canAccessOverview(): boolean {
  if (typeof window === "undefined") return false;
  const raw =
    sessionStorage.getItem("ffops_admin") ?? localStorage.getItem("ffops_admin");
  if (!raw) return false;
  try {
    const admin = JSON.parse(raw) as { role?: string };
    return typeof admin.role === "string" && admin.role.length > 0;
  } catch {
    return false;
  }
}

// --- Start: Overview KPIs live wire (Sachin) ---
export default function OverviewPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [seriesBusy, setSeriesBusy] = useState(false);
  const [snap, setSnap] = useState<OverviewSnapshot>(emptyOverviewSnapshot);
  const [series, setSeries] = useState<OverviewSeries>(emptyOverviewSeries);
  const [range, setRange] = useState<OverviewSeriesRange>("7d");
  const [error, setError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessOverview());
  }, []);

  const loadSeries = useCallback(async (nextRange: OverviewSeriesRange) => {
    setSeriesBusy(true);
    setSeriesError(null);
    try {
      const next = await fetchOverviewSeries(nextRange);
      setSeries(next);
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : "Could not load Overview charts.";
      setSeriesError(msg);
    } finally {
      setSeriesBusy(false);
    }
  }, []);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setBusy(true);
      setError(null);
      try {
        const next = await fetchOverviewSnapshot();
        setSnap(next);
        if (quiet) {
          setNotice(`Refreshed · ${formatRefreshedLabel(next.refreshedAt)}`);
        }
      } catch (e) {
        const msg =
          e instanceof ApiClientError
            ? e.message
            : "Could not load Overview KPIs.";
        setError(msg);
      } finally {
        setLoading(false);
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    void load(false);
  }, [allowed, load]);

  useEffect(() => {
    if (!allowed) return;
    void loadSeries(range);
  }, [allowed, range, loadSeries]);

  if (!allowed) {
    return (
      <section className="mx-auto max-w-6xl">
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950"
        >
          You do not have an active staff session. Sign in again to open
          Overview.
        </div>
      </section>
    );
  }

  const rangeLabel =
    OVERVIEW_RANGE_TABS.find((t) => t.id === range)?.label ?? "7 days";

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <OverviewHeader
        refreshedLabel={formatRefreshedLabel(snap.refreshedAt)}
        busy={busy}
        onRefresh={() => {
          void load(true);
          void loadSeries(range);
        }}
      />

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-[13px] font-medium text-sky-950"
        >
          {notice}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-900"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-[13px] text-slate-500">Loading live KPIs…</p>
      ) : (
        <>
          <OverviewKpis snap={snap} />

          <OverviewRangeTabs
            active={range}
            disabled={seriesBusy}
            onChange={setRange}
          />

          {seriesError ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-900"
            >
              {seriesError}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <OverviewTrendCard points={series.points} rangeLabel={rangeLabel} />
            <OverviewFunnelChart
              funnel={series.funnel}
              rangeLabel={rangeLabel}
            />
          </div>

          <OverviewActivityChart
            points={series.points}
            rangeLabel={rangeLabel}
          />

          <OverviewScreensChart
            screens={series.topScreens}
            rangeLabel={rangeLabel}
          />

          <OverviewEngagementCard engagement={snap.engagement} />
          <OverviewFunnelCard funnel={snap.funnel} />
          <OverviewQualityCard p3={snap.p3} />
          <OverviewPanels
            users={snap.users}
            devices={snap.devices}
            today={snap.today}
            staleHours={snap.meta.staleHours}
          />
          <OverviewQuickLinks />
          <OverviewCapabilities />
        </>
      )}
    </section>
  );
}
// --- End: Overview KPIs live wire (Sachin) ---
