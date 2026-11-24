"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchProMaxConfig,
  saveProMaxConfig,
} from "@/components/promax/promax-api";
import {
  cloneProMaxConfig,
  DEFAULT_PROMAX_CONFIG,
  validateProMaxConfig,
  type ProMaxConfigBundle,
} from "@/components/promax/promax-data";

function canAccess(): boolean {
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
    return (JSON.parse(raw) as { role?: string }).role === "VIEWER";
  } catch {
    return false;
  }
}

export default function ProMaxConfigPage() {
  const [allowed, setAllowed] = useState(true);
  const [viewer, setViewer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ProMaxConfigBundle>(
    cloneProMaxConfig(DEFAULT_PROMAX_CONFIG),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAllowed(canAccess());
    setViewer(isViewer());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfig(cloneProMaxConfig(await fetchProMaxConfig()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ProMax config.");
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

  function patch(field: keyof ProMaxConfigBundle["shareConflict"], value: number) {
    setConfig((prev) => ({
      shareConflict: { ...prev.shareConflict, [field]: value },
    }));
  }

  async function onSave() {
    const err = validateProMaxConfig(config);
    if (err) {
      setError(err);
      setNotice(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await saveProMaxConfig(config);
      setConfig(cloneProMaxConfig(next));
      setNotice("ProMax dampen knobs saved. Live on next promax-offset.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setNotice(null);
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        You need the App module to edit ProMax dampen knobs.
      </div>
    );
  }

  const sc = config.shareConflict;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          ProMax dampen
        </h1>
        <p className="text-sm text-slate-500">
          Soft / hard gap and max shrink for peer↔share conflict. Defaults match
          the app; change without a store rebuild.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Soft gap</span>
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                value={sc.softGap}
                disabled={viewer || saving}
                onChange={(e) => patch("softGap", Number(e.target.value))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
              />
              <span className="text-[11px] text-slate-400">Mean |Δ| below → no dampen</span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Hard gap</span>
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={sc.hardGap}
                disabled={viewer || saving}
                onChange={(e) => patch("hardGap", Number(e.target.value))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
              />
              <span className="text-[11px] text-slate-400">Full conflict at this |Δ|</span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Max shrink</span>
              <input
                type="number"
                min={0}
                max={0.95}
                step={0.05}
                value={sc.maxShrink}
                disabled={viewer || saving}
                onChange={(e) => patch("maxShrink", Number(e.target.value))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
              />
              <span className="text-[11px] text-slate-400">0.75 = cut up to 75%</span>
            </label>
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={viewer || loading || saving}
            onClick={() => void onSave()}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save knobs"}
          </button>
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => void load()}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Reload
          </button>
          {viewer ? (
            <span className="text-xs text-slate-400">Viewers cannot save.</span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
