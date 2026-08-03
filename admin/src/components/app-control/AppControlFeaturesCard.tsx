"use client";

import { AppControlToggle } from "./AppControlToggle";
import {
  APP_FEATURE_META,
  type AppFeatureKey,
  type AppFeatures,
} from "./app-control-data";

type Props = {
  features: AppFeatures;
  onChange: (next: AppFeatures) => void;
};

export function AppControlFeaturesCard({ features, onChange }: Props) {
  function setFeature(key: AppFeatureKey, value: boolean) {
    onChange({ ...features, [key]: value });
  }

  function setAll(value: boolean) {
    const next = { ...features };
    for (const item of APP_FEATURE_META) next[item.key] = value;
    onChange(next);
  }

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-emerald-800 uppercase">
            Features
          </p>
          <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
            Kill-switches
          </h2>
          <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
            Off means the surface is hard-disabled in Android until turned back
            on. Deep links should show a short unavailable state.
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="h-8 rounded-lg bg-emerald-50 px-2.5 text-[12px] font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            Enable all
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="h-8 rounded-lg bg-rose-50 px-2.5 text-[12px] font-semibold text-rose-800 hover:bg-rose-100"
          >
            Disable all
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {APP_FEATURE_META.map((item) => (
          <AppControlToggle
            key={item.key}
            checked={features[item.key]}
            onChange={(v) => setFeature(item.key, v)}
            title={item.title}
            body={item.body}
          />
        ))}
      </div>
    </section>
  );
}
