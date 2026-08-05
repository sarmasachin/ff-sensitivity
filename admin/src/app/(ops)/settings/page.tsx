"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsCapabilities } from "@/components/settings-desk/SettingsCapabilities";
import { SettingsHeader } from "@/components/settings-desk/SettingsHeader";
import { SettingsPreferencesCard } from "@/components/settings-desk/SettingsPreferencesCard";
import { SettingsSecurityCard } from "@/components/settings-desk/SettingsSecurityCard";
import { SettingsSessionCard } from "@/components/settings-desk/SettingsSessionCard";
import { SettingsStats } from "@/components/settings-desk/SettingsStats";
import { SettingsTabs } from "@/components/settings-desk/SettingsTabs";
import {
  fetchOpsSettings,
  purgeAuditLogsApi,
  saveOpsSettingsApi,
} from "@/components/settings-desk/settings-api";
import {
  SETTINGS_DEFAULT_CONFIG,
  computeSettingsStats,
  validateSettingsPreferences,
  validateSettingsSecurity,
  validateSettingsSession,
  type SettingsConfig,
  type SettingsTabId,
} from "@/components/settings-desk/settings-data";

function cloneDefaults(): SettingsConfig {
  return {
    preferences: { ...SETTINGS_DEFAULT_CONFIG.preferences },
    session: { ...SETTINGS_DEFAULT_CONFIG.session },
    security: { ...SETTINGS_DEFAULT_CONFIG.security },
  };
}

function canAccessSettings(): boolean {
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
      ? admin.allowedModules.includes("settings")
      : false;
  } catch {
    return false;
  }
}

function canMutateSettings(): boolean {
  if (typeof window === "undefined") return false;
  const raw =
    sessionStorage.getItem("ffops_admin") ?? localStorage.getItem("ffops_admin");
  if (!raw) return false;
  try {
    const admin = JSON.parse(raw) as { role?: string };
    return admin.role !== "VIEWER";
  } catch {
    return false;
  }
}

// --- Start: Ops settings live wire (Sachin) ---
export default function SettingsPage() {
  const [allowed, setAllowed] = useState(true);
  const [canMutate, setCanMutate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [config, setConfig] = useState<SettingsConfig>(cloneDefaults);
  const [tab, setTab] = useState<SettingsTabId>("preferences");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessSettings());
    setCanMutate(canMutateSettings());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfig(await fetchOpsSettings());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings.");
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

  const stats = useMemo(() => computeSettingsStats(config), [config]);

  async function saveSettings() {
    if (!canMutate || busy) return;
    const prefsErr = validateSettingsPreferences(config.preferences);
    if (prefsErr) {
      setError(prefsErr);
      setNotice(null);
      setTab("preferences");
      return;
    }
    const sessionErr = validateSettingsSession(config.session);
    if (sessionErr) {
      setError(sessionErr);
      setNotice(null);
      setTab("session");
      return;
    }
    const securityErr = validateSettingsSecurity(config.security);
    if (securityErr) {
      setError(securityErr);
      setNotice(null);
      setTab("security");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await saveOpsSettingsApi(config);
      setConfig(saved);
      const s = computeSettingsStats(saved);
      setNotice(
        `Settings saved — idle ${s.idleMinutes}m · session ${s.sessionHours}h · audit ${s.auditDays}d · reauth ${s.reauthGates}/3.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setNotice(null);
    } finally {
      setBusy(false);
    }
  }

  async function runAuditPurge() {
    if (!canMutate || purgeBusy) return;
    setPurgeBusy(true);
    setError(null);
    try {
      const result = await purgeAuditLogsApi();
      setConfig((c) => ({
        ...c,
        security: {
          ...c.security,
          lastAuditPurgeAt: result.lastAuditPurgeAt,
        },
      }));
      setNotice(
        result.skipped
          ? "Auto-purge is off — enable it or keep using Run now."
          : `Purged ${result.deleted} audit row(s) older than ${result.retentionDays} days.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purge failed.");
      setNotice(null);
    } finally {
      setPurgeBusy(false);
    }
  }

  function resetDefaults() {
    if (!canMutate) return;
    setConfig(cloneDefaults());
    setError(null);
    setNotice("Reset to defaults locally — Save to persist.");
    setTab("preferences");
  }

  if (!allowed) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <SettingsHeader onSave={() => undefined} onReset={() => undefined} />
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          You do not have access to Settings. Ask a Super Admin to grant the
          settings module.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <SettingsHeader
        onSave={() => {
          void saveSettings();
        }}
        onReset={resetDefaults}
      />
      {loading ? (
        <p className="rounded-2xl border border-[#e8eaee] bg-white px-4 py-8 text-center text-[13px] text-[#94a3b8]">
          Loading settings…
        </p>
      ) : (
        <>
          <SettingsStats
            idleMinutes={stats.idleMinutes}
            sessionHours={stats.sessionHours}
            reauthGates={stats.reauthGates}
            singleSession={stats.singleSession}
            landing={stats.landing}
          />

          {notice ? (
            <div
              role="status"
              className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-[13px] font-medium text-orange-950"
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
          {!canMutate ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
              Viewer role is read-only on Settings.
            </p>
          ) : null}

          <SettingsTabs active={tab} onChange={setTab} />

          {tab === "preferences" ? (
            <SettingsPreferencesCard
              preferences={config.preferences}
              onChange={(preferences) =>
                setConfig((c) => ({ ...c, preferences }))
              }
            />
          ) : null}

          {tab === "session" ? (
            <SettingsSessionCard
              session={config.session}
              onChange={(session) => setConfig((c) => ({ ...c, session }))}
            />
          ) : null}

          {tab === "security" ? (
            <SettingsSecurityCard
              security={config.security}
              canMutate={canMutate}
              purgeBusy={purgeBusy}
              onPurgeNow={() => {
                void runAuditPurge();
              }}
              onChange={(security) => setConfig((c) => ({ ...c, security }))}
            />
          ) : null}

          <SettingsCapabilities />
        </>
      )}
    </section>
  );
}
// --- End: Ops settings live wire (Sachin) ---
