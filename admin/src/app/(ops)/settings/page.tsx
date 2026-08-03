"use client";

import { useMemo, useState } from "react";
import { SettingsCapabilities } from "@/components/settings-desk/SettingsCapabilities";
import { SettingsHeader } from "@/components/settings-desk/SettingsHeader";
import { SettingsPreferencesCard } from "@/components/settings-desk/SettingsPreferencesCard";
import { SettingsSecurityCard } from "@/components/settings-desk/SettingsSecurityCard";
import { SettingsSessionCard } from "@/components/settings-desk/SettingsSessionCard";
import { SettingsStats } from "@/components/settings-desk/SettingsStats";
import { SettingsTabs } from "@/components/settings-desk/SettingsTabs";
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

export default function SettingsPage() {
  const [config, setConfig] = useState<SettingsConfig>(cloneDefaults);
  const [tab, setTab] = useState<SettingsTabId>("preferences");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => computeSettingsStats(config), [config]);

  function saveSettings() {
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
    setError(null);
    setNotice(
      `Settings saved (local demo) — idle ${config.session.idleTimeoutMinutes}m · session ${config.session.absoluteSessionHours}h · reauth ${stats.reauthGates}/3.`,
    );
  }

  function resetDefaults() {
    setConfig(cloneDefaults());
    setError(null);
    setNotice("Reset to default console settings.");
    setTab("preferences");
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <SettingsHeader onSave={saveSettings} onReset={resetDefaults} />
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
          onChange={(security) => setConfig((c) => ({ ...c, security }))}
        />
      ) : null}

      <SettingsCapabilities />
    </section>
  );
}
