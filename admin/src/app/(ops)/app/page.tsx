"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppControlCapabilities } from "@/components/app-control/AppControlCapabilities";
import { AppControlFeaturesCard } from "@/components/app-control/AppControlFeaturesCard";
import { AppControlHeader } from "@/components/app-control/AppControlHeader";
import { AppControlLinksCard } from "@/components/app-control/AppControlLinksCard";
import { AppControlNavCard } from "@/components/app-control/AppControlNavCard";
import { AppControlStats } from "@/components/app-control/AppControlStats";
import { AppControlStatusCard } from "@/components/app-control/AppControlStatusCard";
import { AppControlTabs } from "@/components/app-control/AppControlTabs";
import { fetchAppConfig, saveAppConfig } from "@/components/app-control/app-api";
import {
  APP_DEFAULT_CONFIG,
  computeAppStats,
  validateAppLinks,
  validateAppStatus,
  type AppControlTabId,
  type AppRemoteConfig,
} from "@/components/app-control/app-control-data";

function canAccessApp(): boolean {
  if (typeof window === "undefined") return false;
  const raw =
    sessionStorage.getItem("ffops_admin") ?? localStorage.getItem("ffops_admin");
  if (!raw) return false;
  try {
    const admin = JSON.parse(raw) as {
      role?: string;
      allowedModules?: string[];
    };
    if (admin.role === "SUPER_ADMIN") return true;
    return Array.isArray(admin.allowedModules)
      ? admin.allowedModules.includes("app")
      : false;
  } catch {
    return false;
  }
}

function cloneDefault(): AppRemoteConfig {
  return {
    status: { ...APP_DEFAULT_CONFIG.status },
    features: { ...APP_DEFAULT_CONFIG.features },
    navigation: { ...APP_DEFAULT_CONFIG.navigation },
    links: { ...APP_DEFAULT_CONFIG.links },
  };
}

// --- Start: App remote config live wire (Sachin) ---
export default function AppControlPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AppRemoteConfig>(cloneDefault);
  const [tab, setTab] = useState<AppControlTabId>("status");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessApp());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchAppConfig();
      setConfig(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load app config.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    void load();
  }, [allowed, load]);

  const stats = useMemo(() => computeAppStats(config), [config]);

  async function onSave() {
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
    // Client mirror of Nest https-only rule
    for (const [label, url] of [
      ["Play Store", config.links.playStoreUrl],
      ["Privacy", config.links.privacyUrl],
      ["Website", config.links.websiteUrl],
    ] as const) {
      if (!url.trim().toLowerCase().startsWith("https://")) {
        setError(`${label} URL must use https.`);
        setNotice(null);
        setTab("links");
        return;
      }
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await saveAppConfig(config);
      setConfig(saved);
      setNotice(
        `Saved live — ${stats.featuresOn} features on · min ${saved.status.minVersionName}${saved.status.maintenanceMode ? " · maintenance ON" : ""}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center text-[13px] font-medium text-rose-900">
          You do not have access to App config. Ask a Super Admin for the app
          module.
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-2xl border border-[#e8eaee] bg-white px-5 py-10 text-center text-[13px] text-slate-500">
          Loading app config…
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <AppControlHeader onSave={saving ? undefined : () => void onSave()} />
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
      {saving ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-600">
          Saving to Nest…
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
// --- End: App remote config live wire (Sachin) ---
