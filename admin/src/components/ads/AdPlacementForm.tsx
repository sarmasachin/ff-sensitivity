import type { AdPlacementConfig } from "./ads-data";

type Props = {
  title: string;
  subtitle: string;
  value: AdPlacementConfig;
  onChange: (next: AdPlacementConfig) => void;
  readOnly?: boolean;
  /** Keep cooldown editable even when placement is Off (e.g. coin-only unlock window). */
  allowCooldownWhenDisabled?: boolean;
  /** Override the cooldown field label. */
  cooldownLabel?: string;
  /** Override the default cooldown help text. */
  cooldownHint?: string;
  /** Edit as hours (Daily Check-in / Quiz) or minutes (default). */
  cooldownUnit?: "minutes" | "hours";
};

const labelClass = "block text-[11px] font-semibold tracking-wide text-slate-600";
const fieldClass =
  "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:bg-slate-50 disabled:text-slate-400";
const areaClass =
  "mt-1.5 min-h-[72px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium leading-snug text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:bg-slate-50 disabled:text-slate-400";

export function AdPlacementForm({
  title,
  subtitle,
  value,
  onChange,
  readOnly,
  allowCooldownWhenDisabled = false,
  cooldownLabel,
  cooldownHint,
  cooldownUnit = "minutes",
}: Props) {
  function patch(partial: Partial<AdPlacementConfig>) {
    onChange({ ...value, ...partial });
  }

  const cooldownDisabled =
    readOnly || (!value.enabled && !allowCooldownWhenDisabled);
  const useHours = cooldownUnit === "hours";
  const resolvedLabel =
    cooldownLabel ??
    (useHours ? "Cooldown (hours)" : "Cooldown (minutes)");
  const resolvedHint =
    cooldownHint ??
    (useHours
      ? "Hours until this ad can show again · 0 = every time · max 168 (7d)"
      : "Minutes until this ad can show again · 0 = every time · max 10080 (7d)");

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200/90 bg-slate-50/40 p-4">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-bold tracking-[-0.02em] text-slate-900">
            {title}
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
            {subtitle}
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-600">
            {value.enabled ? "On" : "Off"}
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={value.enabled}
            disabled={readOnly}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
        </label>
      </div>

      <div className="mt-3 grid flex-1 gap-3">
        <label className={labelClass}>
          {resolvedLabel}
          <input
            type="number"
            min={0}
            max={useHours ? 168 : 10080}
            disabled={cooldownDisabled}
            className={`${fieldClass} tabular-nums`}
            value={useHours ? value.cooldownHours : value.cooldownMinutes}
            onChange={(e) => {
              if (useHours) {
                const cooldownHours = Math.min(
                  168,
                  Math.max(0, Math.trunc(Number(e.target.value) || 0)),
                );
                patch({
                  cooldownHours,
                  cooldownMinutes: cooldownHours * 60,
                });
                return;
              }
              const cooldownMinutes = Math.trunc(Number(e.target.value) || 0);
              const hours =
                cooldownMinutes <= 0
                  ? 0
                  : Math.min(168, Math.max(1, Math.ceil(cooldownMinutes / 60)));
              patch({ cooldownMinutes, cooldownHours: hours });
            }}
          />
          <span className="mt-1 block text-[10px] font-normal text-slate-400">
            {resolvedHint}
          </span>
        </label>

        <label className={labelClass}>
          Button label
          <input
            type="text"
            maxLength={200}
            disabled={readOnly}
            className={fieldClass}
            value={value.buttonLabel}
            onChange={(e) => patch({ buttonLabel: e.target.value })}
          />
        </label>

        <label className={labelClass}>
          Incomplete message
          <textarea
            rows={3}
            maxLength={200}
            disabled={readOnly}
            className={areaClass}
            value={value.incompleteMessage}
            onChange={(e) => patch({ incompleteMessage: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
