"use client";

import { useMemo, useState } from "react";
import { AppControlCapabilities } from "@/components/app-control/AppControlCapabilities";
import { AppControlFeaturesCard } from "@/components/app-control/AppControlFeaturesCard";
import { AppControlHeader } from "@/components/app-control/AppControlHeader";
import { AppControlLinksCard } from "@/components/app-control/AppControlLinksCard";
import { AppControlNavCard } from "@/components/app-control/AppControlNavCard";
import { AppControlStats } from "@/components/app-control/AppControlStats";
import { AppControlStatusCard } from "@/components/app-control/AppControlStatusCard";
import { AppControlTabs } from "@/components/app-control/AppControlTabs";
import {
  APP_DEFAULT_CONFIG,
  computeAppStats,
  validateAppLinks,
  validateAppStatus,
  type AppControlTabId,
  type AppRemoteConfig,
} from "@/components/app-control/app-control-data";

export default function AppControlPage() {
  const [config, setConfig] = useState<AppRemoteConfig>(() => ({
    status: { ...APP_DEFAULT_CONFIG.status },
    features: { ...APP_DEFAULT_CONFIG.features },
    navigation: { ...APP_DEFAULT_CONFIG.navigation },
    links: { ...APP_DEFAULT_CONFIG.links },
  }));
  const [tab, setTab] = useState<AppControlTabId>("status");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => computeAppStats(config), [config]);

  function saveConfig() {
    const statusErr = validateAppStatus(config.status);
    if (statusErr) {
      setError(statusErr);
      setNotice(null);
      setTab("status");
      return;
    }
    const linksErr = validateAppLinks(config.links);
    if (linksErr) {
      setError(linksErr);
      setNotice(null);
      setTab("links");
      return;
    }
    setError(null);
    setNotice(
      `Config saved (local demo) — ${stats.featuresOn} features on · min ${config.status.minVersionName}${config.status.maintenanceMode ? " · maintenance ON" : ""}.`,
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <AppControlHeader onSave={saveConfig} />
      <AppControlStats
        featuresOn={stats.featuresOn}
        featuresOff={stats.featuresOff}
        navOn={stats.navOn}
        maintenance={stats.maintenance}
        minVersion={stats.minVersion}
      />

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-950"
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

      <AppControlTabs active={tab} onChange={setTab} />

      {tab === "status" ? (
        <AppControlStatusCard
          status={config.status}
          onChange={(status) => setConfig((c) => ({ ...c, status }))}
        />
      ) : null}

      {tab === "features" ? (
        <AppControlFeaturesCard
          features={config.features}
          onChange={(features) => setConfig((c) => ({ ...c, features }))}
        />
      ) : null}

      {tab === "navigation" ? (
        <AppControlNavCard
          navigation={config.navigation}
          onChange={(navigation) => setConfig((c) => ({ ...c, navigation }))}
        />
      ) : null}

      {tab === "links" ? (
        <AppControlLinksCard
          links={config.links}
          onChange={(links) => setConfig((c) => ({ ...c, links }))}
        />
      ) : null}

      <AppControlCapabilities />
    </section>
  );
}
