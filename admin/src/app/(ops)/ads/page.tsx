"use client";

import { useCallback, useEffect, useState } from "react";
import { AdPlacementForm } from "@/components/ads/AdPlacementForm";
import { AdsHeader } from "@/components/ads/AdsHeader";
import { DailyChallengeAdsForm } from "@/components/ads/DailyChallengeAdsForm";
import { fetchAdsConfig, saveAdsConfig } from "@/components/ads/ads-api";
import {
  challengeCooldownFromAdBonus,
  cloneAdsConfig,
  DEFAULT_ADS_CONFIG,
  validateAdsConfig,
  type AdsConfigBundle,
} from "@/components/ads/ads-data";
import {
  DEFAULT_DAILY_CHALLENGE_ADS,
  validateDailyChallengeAds,
  type DailyChallengeAdsState,
} from "@/components/ads/daily-challenge-ads-data";
import {
  fetchChallengeBundle,
  saveChallengeBundle,
  type ChallengeBundle,
} from "@/components/challenge/challenge-api";
import { ApiClientError } from "@/lib/api";

function canAccessAds(): boolean {
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

function isViewer(): boolean {
  if (typeof window === "undefined") return false;
  const raw =
    sessionStorage.getItem("ffops_admin") ?? localStorage.getItem("ffops_admin");
  if (!raw) return false;
  try {
    const admin = JSON.parse(raw) as { role?: string };
    return admin.role === "VIEWER";
  } catch {
    return false;
  }
}

function trimPlacement(p: AdsConfigBundle["calculate"]) {
  return {
    ...p,
    incompleteMessage: p.incompleteMessage.trim(),
    buttonLabel: p.buttonLabel.trim(),
  };
}

function dailyFromBundle(bundle: ChallengeBundle): DailyChallengeAdsState {
  return {
    wrongAnswerLockMinutes: bundle.rules.wrongAnswerLockMinutes,
  };
}

function mergeAdBonusFromChallenge(
  ads: AdsConfigBundle,
  bundle: ChallengeBundle,
): AdsConfigBundle {
  const base = ads.adBonus ?? DEFAULT_ADS_CONFIG.adBonus;
  return {
    ...ads,
    adBonus: {
      ...base,
      enabled: bundle.rules.adBonusOptional,
      cooldownHours: bundle.rules.adBonusCooldownHours,
    },
  };
}

export default function AdsPage() {
  const [allowed, setAllowed] = useState(true);
  const [viewer, setViewer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AdsConfigBundle>(cloneAdsConfig);
  const [daily, setDaily] = useState<DailyChallengeAdsState>(
    DEFAULT_DAILY_CHALLENGE_ADS,
  );
  const [challengeBundle, setChallengeBundle] =
    useState<ChallengeBundle | null>(null);
  const [challengeDenied, setChallengeDenied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccessAds());
    setViewer(isViewer());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setChallengeDenied(false);
    try {
      const next = await fetchAdsConfig();
      setConfig(cloneAdsConfig(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ads config.");
      setLoading(false);
      return;
    }

    try {
      const bundle = await fetchChallengeBundle();
      setChallengeBundle(bundle);
      setDaily(dailyFromBundle(bundle));
      setConfig((prev) => mergeAdBonusFromChallenge(prev, bundle));
    } catch (e) {
      setChallengeBundle(null);
      setDaily(DEFAULT_DAILY_CHALLENGE_ADS);
      if (e instanceof ApiClientError && e.status === 403) {
        setChallengeDenied(true);
      } else {
        setError(
          e instanceof Error
            ? e.message
            : "Failed to load Daily Challenge ad settings.",
        );
      }
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

  async function onSave() {
    if (viewer) {
      setError("Viewers cannot change Ads config.");
      return;
    }
    const adsInvalid = validateAdsConfig(config);
    if (adsInvalid) {
      setError(adsInvalid);
      setNotice(null);
      return;
    }
    if (challengeBundle) {
      const dailyInvalid = validateDailyChallengeAds(daily);
      if (dailyInvalid) {
        setError(dailyInvalid);
        setNotice(null);
        return;
      }
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const adBonus = trimPlacement(
        config.adBonus ?? DEFAULT_ADS_CONFIG.adBonus,
      );
      const nextAds = await saveAdsConfig({
        calculate: trimPlacement(config.calculate),
        dpi: trimPlacement(config.dpi ?? DEFAULT_ADS_CONFIG.dpi),
        quiz: trimPlacement(config.quiz ?? DEFAULT_ADS_CONFIG.quiz),
        secondChance: trimPlacement(
          config.secondChance ?? DEFAULT_ADS_CONFIG.secondChance,
        ),
        adBonus,
        checkIn: trimPlacement(config.checkIn ?? DEFAULT_ADS_CONFIG.checkIn),
        redeemDaily: trimPlacement(
          config.redeemDaily ?? DEFAULT_ADS_CONFIG.redeemDaily,
        ),
      });
      setConfig(cloneAdsConfig(nextAds));

      if (challengeBundle) {
        const saved = await saveChallengeBundle({
          rules: {
            ...challengeBundle.rules,
            adBonusOptional: adBonus.enabled,
            adBonusCooldownHours: challengeCooldownFromAdBonus(
              adBonus.cooldownHours,
            ),
            wrongAnswerLockMinutes: daily.wrongAnswerLockMinutes,
          },
        });
        setChallengeBundle(saved);
        setDaily(dailyFromBundle(saved));
        setConfig((prev) => mergeAdBonusFromChallenge(prev, saved));
      }

      setNotice(
        challengeBundle
          ? "Saved ad placements + Daily Challenge lock."
          : "Saved ad placements. Challenge sync skipped.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
        You do not have access to Ads (requires App module).
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <AdsHeader
        viewer={viewer}
        saving={saving}
        onRefresh={() => void load()}
        onSave={viewer ? undefined : () => void onSave()}
      />

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[12px] font-medium text-emerald-900">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-[12px] font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-[13px] text-slate-500">
          Loading ads form…
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                  Tools
                </p>
                <h2 className="text-[15px] font-bold tracking-[-0.02em] text-slate-900">
                  Ad placements
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Toggle Off to skip the ad gate for that placement.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <AdPlacementForm
                title="Calculate Best Pro Settings"
                subtitle="Gate before opening calculated results."
                value={config.calculate}
                readOnly={viewer}
                onChange={(calculate) =>
                  setConfig((prev) => ({ ...prev, calculate }))
                }
              />
              <AdPlacementForm
                title="DPI & Resolution"
                subtitle="Gate before opening DPI results."
                value={config.dpi ?? DEFAULT_ADS_CONFIG.dpi}
                readOnly={viewer}
                onChange={(dpi) => setConfig((prev) => ({ ...prev, dpi }))}
              />
              <AdPlacementForm
                title="Daily Quiz submit"
                subtitle="Interstitial before quiz answer submit."
                value={config.quiz ?? DEFAULT_ADS_CONFIG.quiz}
                readOnly={viewer}
                onChange={(quiz) => setConfig((prev) => ({ ...prev, quiz }))}
              />
              <AdPlacementForm
                title="Quiz second chance"
                subtitle="Rewarded ad after lock to unlock a new question."
                value={
                  config.secondChance ?? DEFAULT_ADS_CONFIG.secondChance
                }
                readOnly={viewer}
                onChange={(secondChance) =>
                  setConfig((prev) => ({ ...prev, secondChance }))
                }
              />
              <AdPlacementForm
                title="Watch Ad Bonus"
                subtitle="Rewarded bonus coins on Daily Challenge. Syncs challenge rules."
                value={config.adBonus ?? DEFAULT_ADS_CONFIG.adBonus}
                readOnly={viewer}
                onChange={(adBonus) =>
                  setConfig((prev) => ({ ...prev, adBonus }))
                }
              />
              <AdPlacementForm
                title="Daily Check-in"
                subtitle="Interstitial before claiming daily check-in coins."
                value={config.checkIn ?? DEFAULT_ADS_CONFIG.checkIn}
                readOnly={viewer}
                onChange={(checkIn) =>
                  setConfig((prev) => ({ ...prev, checkIn }))
                }
              />
              <AdPlacementForm
                title="Redeem Daily"
                subtitle="Interstitial before opening a Daily redeem scratch card."
                value={config.redeemDaily ?? DEFAULT_ADS_CONFIG.redeemDaily}
                readOnly={viewer}
                onChange={(redeemDaily) =>
                  setConfig((prev) => ({ ...prev, redeemDaily }))
                }
              />
            </div>
          </section>

          {challengeBundle ? (
            <DailyChallengeAdsForm
              value={daily}
              readOnly={viewer}
              onChange={setDaily}
            />
          ) : challengeDenied ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] text-amber-900">
              Daily Challenge ad controls need the{" "}
              <span className="font-semibold">daily_challenge</span> module.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
