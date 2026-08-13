"use client";

import type {
  RedeemCadenceRow,
  RedeemFormValues,
  RedeemStatus,
  RedeemTypeRow,
} from "./redeem-data";

const fieldBase =
  "mt-0.5 w-full min-w-0 rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 text-[12px] text-slate-900 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10";
const fieldClass = `${fieldBase} h-8`;
const labelClass = "block min-w-0 text-[10px] font-semibold text-slate-600";

type Props = {
  scratch: boolean;
  values: RedeemFormValues;
  types: RedeemTypeRow[];
  cadences: RedeemCadenceRow[];
  patch: <K extends keyof RedeemFormValues>(
    key: K,
    value: RedeemFormValues[K],
  ) => void;
};

export function RedeemFormInventory({
  scratch,
  values,
  types,
  cadences,
  patch,
}: Props) {
  const enabledTypes = types.filter((t) => t.enabled);
  const enabledCadences = cadences.filter((c) => c.enabled);

  return (
    <>
      <p className="mt-2.5 mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
        Inventory
      </p>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>
          Type
          <select
            className={fieldClass}
            value={values.type}
            onChange={(e) => patch("type", e.target.value)}
          >
            {enabledTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Cadence
          <select
            className={fieldClass}
            value={values.cadence}
            onChange={(e) => patch("cadence", e.target.value)}
          >
            {enabledCadences.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Status
          <select
            className={fieldClass}
            value={values.status}
            onChange={(e) => patch("status", e.target.value as RedeemStatus)}
          >
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="EXHAUSTED">Exhausted</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </label>
        {!scratch ? (
          <>
            <label className={labelClass}>
              Stock
              <select
                className={fieldClass}
                value={values.stockLeft}
                onChange={(e) => patch("stockLeft", Number(e.target.value))}
              >
                <option value={1}>1 — available</option>
                <option value={0}>0 — claimed / empty</option>
              </select>
            </label>
            <label className={labelClass}>
              Coin cost
              <input
                className={fieldClass}
                value={values.coinCost}
                onChange={(e) => patch("coinCost", e.target.value)}
                placeholder="Leave blank if free"
              />
            </label>
          </>
        ) : (
          <>
            <label className={labelClass}>
              Coin min
              <input
                className={fieldClass}
                value={values.coinRewardMin}
                onChange={(e) => patch("coinRewardMin", e.target.value)}
                required
              />
            </label>
            <label className={labelClass}>
              Coin max
              <input
                className={fieldClass}
                value={values.coinRewardMax}
                onChange={(e) => patch("coinRewardMax", e.target.value)}
                required
              />
            </label>
            <label className={labelClass}>
              Window (min)
              <input
                className={fieldClass}
                value={values.windowMinutes}
                onChange={(e) => patch("windowMinutes", e.target.value)}
              />
            </label>
            <label className={labelClass}>
              Codes / window
              <input
                className={fieldClass}
                value={values.codesPerWindow}
                onChange={(e) => patch("codesPerWindow", e.target.value)}
              />
            </label>
            <label className={labelClass}>
              Starts at
              <input
                type="datetime-local"
                className={fieldClass}
                value={values.startsAtLocal}
                onChange={(e) => patch("startsAtLocal", e.target.value)}
              />
            </label>
            <label className={labelClass}>
              Ends at
              <input
                type="datetime-local"
                className={fieldClass}
                value={values.endsAtLocal}
                onChange={(e) => patch("endsAtLocal", e.target.value)}
              />
            </label>
          </>
        )}
        <label className={labelClass}>
          Expires label
          <input
            className={fieldClass}
            value={values.expiresLabel}
            onChange={(e) => patch("expiresLabel", e.target.value)}
            placeholder={scratch ? "Schedule" : "In 4 hours"}
          />
        </label>
      </div>
    </>
  );
}
