"use client";

import { AppControlToggle } from "./AppControlToggle";
import {
  APP_NAV_META,
  type AppNavKey,
  type AppNavVisibility,
} from "./app-control-data";

type Props = {
  navigation: AppNavVisibility;
  onChange: (next: AppNavVisibility) => void;
};

export function AppControlNavCard({ navigation, onChange }: Props) {
  function setNav(key: AppNavKey, value: boolean) {
    onChange({ ...navigation, [key]: value });
  }

  const home = APP_NAV_META.filter((i) => i.group === "home");
  const drawer = APP_NAV_META.filter((i) => i.group === "drawer");

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-emerald-800 uppercase">
        Navigation
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Home tiles & drawer links
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Hide entry points without deleting the feature. Pair with kill-switches
        when the surface must be fully offline.
      </p>

      <h3 className="mt-5 text-[12px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
        Home grid
      </h3>
      <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
        {home.map((item) => (
          <AppControlToggle
            key={item.key}
            checked={navigation[item.key]}
            onChange={(v) => setNav(item.key, v)}
            title={item.title}
            body={item.body}
          />
        ))}
      </div>

      <h3 className="mt-6 text-[12px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
        Side drawer
      </h3>
      <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
        {drawer.map((item) => (
          <AppControlToggle
            key={item.key}
            checked={navigation[item.key]}
            onChange={(v) => setNav(item.key, v)}
            title={item.title}
            body={item.body}
          />
        ))}
      </div>
    </section>
  );
}
