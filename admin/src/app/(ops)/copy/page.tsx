"use client";

import { useMemo, useState } from "react";
import { CopyAboutCard } from "@/components/copy-desk/CopyAboutCard";
import { CopyCapabilities } from "@/components/copy-desk/CopyCapabilities";
import { CopyHeader } from "@/components/copy-desk/CopyHeader";
import { CopyLegalCard } from "@/components/copy-desk/CopyLegalCard";
import { CopyRateCard } from "@/components/copy-desk/CopyRateCard";
import { CopyShareCard } from "@/components/copy-desk/CopyShareCard";
import { CopyStats } from "@/components/copy-desk/CopyStats";
import { CopyTabs } from "@/components/copy-desk/CopyTabs";
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

export default function CopyPage() {
  const [config, setConfig] = useState<CopyRemoteConfig>(cloneDefaults);
  const [tab, setTab] = useState<CopyTabId>("rate");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => computeCopyStats(config), [config]);

  function saveCopy() {
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
    setError(null);
    setNotice(
      `Copy saved (local demo) — rate ${config.rate.enabled ? "ON" : "OFF"} · ${stats.chars.toLocaleString()} chars · min sessions ${config.rate.minSessions}.`,
    );
  }

  function resetDefaults() {
    setConfig(cloneDefaults());
    setError(null);
    setNotice("Reset to default marketing copy.");
    setTab("rate");
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <CopyHeader onSave={saveCopy} onReset={resetDefaults} />
      <CopyStats
        sections={stats.sections}
        filled={stats.filled}
        rateOn={stats.rateOn}
        chars={stats.chars}
        minSessions={stats.minSessions}
      />

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

      <CopyCapabilities />
    </section>
  );
}
