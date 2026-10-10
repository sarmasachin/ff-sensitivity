"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiClientError } from "@/lib/api";
import { EconomyBoostNotes } from "@/components/economy/EconomyBoostNotes";
import { EconomyCapabilities } from "@/components/economy/EconomyCapabilities";
import { EconomyEarnPanel } from "@/components/economy/EconomyEarnPanel";
import { EconomyHeader } from "@/components/economy/EconomyHeader";
import { EconomyLimitsPanel } from "@/components/economy/EconomyLimitsPanel";
import { EconomyStats } from "@/components/economy/EconomyStats";
import {
  fetchEconomyConfig,
  saveEconomyConfig,
} from "@/components/economy/economy-api";
import {
  ECONOMY_DEFAULTS,
  configToForm,
  formToConfig,
  liveSourceCount,
  maxDailyEarn,
  type EconomyConfig,
  type EconomyFormValues,
} from "@/components/economy/economy-data";

function sameForm(a: EconomyFormValues, b: EconomyFormValues) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function EconomyPage() {
  const [saved, setSaved] = useState<EconomyConfig>(ECONOMY_DEFAULTS);
  const [form, setForm] = useState<EconomyFormValues>(() =>
    configToForm(ECONOMY_DEFAULTS),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const savedForm = useMemo(() => configToForm(saved), [saved]);
  const dirty = !sameForm(form, savedForm);

  const preview = useMemo(() => {
    const parsed = formToConfig(form);
    if ("error" in parsed) return saved;
    return parsed;
  }, [form, saved]);

  useEffect(() => {
    let cancelled = false;
    void fetchEconomyConfig()
      .then((cfg) => {
        if (cancelled) return;
        setSaved(cfg);
        setForm(configToForm(cfg));
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiClientError ? err.message : "Could not load economy.");
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    const parsed = formToConfig(form);
    if ("error" in parsed) {
      setError(parsed.error);
      setNotice(null);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const cfg = await saveEconomyConfig(parsed);
      setSaved(cfg);
      setForm(configToForm(cfg));
      setNotice("Economy saved. The app uses these rates on the next earn.");
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Could not save economy.");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setForm(configToForm(saved));
    setError(null);
    setNotice("Reverted to last saved draft.");
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <EconomyHeader
        dirty={dirty && ready}
        busy={busy}
        onSave={() => void handleSave()}
        onReset={handleReset}
      />
      <EconomyStats
        maxDaily={maxDailyEarn(preview)}
        liveSources={liveSourceCount(preview)}
        walletCap={preview.limits.walletCap}
        dirty={dirty}
      />

      {(notice || error) && (
        <div
          role="status"
          className={[
            "rounded-xl border px-4 py-2.5 text-[13px] font-medium",
            error
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-900",
          ].join(" ")}
        >
          {error ?? notice}
        </div>
      )}

      <EconomyEarnPanel
        values={form}
        onChange={(next) => {
          setForm(next);
          setError(null);
          setNotice(null);
        }}
      />
      <EconomyLimitsPanel
        values={form}
        onChange={(next) => {
          setForm(next);
          setError(null);
          setNotice(null);
        }}
      />
      <EconomyBoostNotes />
      <EconomyCapabilities />
    </section>
  );
}
