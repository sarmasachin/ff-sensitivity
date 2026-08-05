"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CopyAboutCard } from "@/components/copy-desk/CopyAboutCard";
import { CopyCapabilities } from "@/components/copy-desk/CopyCapabilities";
import { CopyHeader } from "@/components/copy-desk/CopyHeader";
import { CopyLegalCard } from "@/components/copy-desk/CopyLegalCard";
import { CopyRateCard } from "@/components/copy-desk/CopyRateCard";
import { CopyShareCard } from "@/components/copy-desk/CopyShareCard";
import { CopyStats } from "@/components/copy-desk/CopyStats";
import { CopyTabs } from "@/components/copy-desk/CopyTabs";
import {
  fetchCopyConfig,
  saveCopyConfigApi,
} from "@/components/copy-desk/copy-api";
import {
  COPY_DEFAULT_CONFIG,
  computeCopyStats,
  validateCopyAbout,
  validateCopyLegal,
  validateCopyRate,
  validateCopyShare,
  type CopyRemoteConfig,
  type CopyTabId,
} from "@/components/copy-desk/copy-data";

function cloneDefaults(): CopyRemoteConfig {
  return {
    rate: { ...COPY_DEFAULT_CONFIG.rate },
    share: { ...COPY_DEFAULT_CONFIG.share },
    about: { ...COPY_DEFAULT_CONFIG.about },
    legal: { ...COPY_DEFAULT_CONFIG.legal },
  };
}

function canAccessCopy(): boolean {
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
      ? admin.allowedModules.includes("copy")
      : false;
  } catch {
    return false;
  }
}

// --- Start: Copy CMS live wire (Sachin) ---
export default function CopyPage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<CopyRemoteConfig>(cloneDefaults);
  const [tab, setTab] = useState<CopyTabId>("rate");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessCopy());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfig(await fetchCopyConfig());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load copy.");
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

  const stats = useMemo(() => computeCopyStats(config), [config]);

  async function saveCopy() {
    const rateErr = validateCopyRate(config.rate);
    if (rateErr) {
      setError(rateErr);
      setNotice(null);
      setTab("rate");
      return;
    }
    const shareErr = validateCopyShare(config.share);
    if (shareErr) {
      setError(shareErr);
      setNotice(null);
      setTab("share");
      return;
    }
    const aboutErr = validateCopyAbout(config.about);
    if (aboutErr) {
      setError(aboutErr);
      setNotice(null);
      setTab("about");
      return;
    }
    const legalErr = validateCopyLegal(config.legal);
    if (legalErr) {
      setError(legalErr);
      setNotice(null);
      setTab("legal");
      return;
    }
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await saveCopyConfigApi(config);
      setConfig(saved);
      setNotice(
        `Copy published — rate ${saved.rate.enabled ? "ON" : "OFF"} · ${computeCopyStats(saved).chars.toLocaleString()} chars · min sessions ${saved.rate.minSessions}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setNotice(null);
    } finally {
      setBusy(false);
    }
  }

  function resetDefaults() {
    setConfig(cloneDefaults());
    setError(null);
    setNotice("Reset to default marketing copy (not saved yet).");
    setTab("rate");
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-sm text-amber-950">
        You do not have access to the Copy module.
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <CopyHeader onSave={() => void saveCopy()} onReset={resetDefaults} />
      {loading ? (
        <p className="text-sm text-slate-500">Loading copy…</p>
      ) : (
        <CopyStats
          sections={stats.sections}
          filled={stats.filled}
          rateOn={stats.rateOn}
          chars={stats.chars}
          minSessions={stats.minSessions}
        />
      )}

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-[13px] font-medium text-violet-950"
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

      {!loading ? (
        <>
          <CopyTabs active={tab} onChange={setTab} />

          {tab === "rate" ? (
            <CopyRateCard
              rate={config.rate}
              onChange={(rate) => setConfig((c) => ({ ...c, rate }))}
            />
          ) : null}

          {tab === "share" ? (
            <CopyShareCard
              share={config.share}
              onChange={(share) => setConfig((c) => ({ ...c, share }))}
            />
          ) : null}

          {tab === "about" ? (
            <CopyAboutCard
              about={config.about}
              onChange={(about) => setConfig((c) => ({ ...c, about }))}
            />
          ) : null}

          {tab === "legal" ? (
            <CopyLegalCard
              legal={config.legal}
              onChange={(legal) => setConfig((c) => ({ ...c, legal }))}
            />
          ) : null}
        </>
      ) : null}

      <CopyCapabilities />
    </section>
  );
}
// --- End: Copy CMS live wire (Sachin) ---
