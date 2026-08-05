"use client";

export type ChartTooltipRow = {
  label: string;
  value: string;
  dotClass?: string;
  dotColor?: string;
};

type Props = {
  title: string;
  rows: ChartTooltipRow[];
  /** Horizontal anchor inside the relative parent, 0–100. */
  leftPct: number;
  /** Vertical anchor inside the relative parent, 0–100 (centred on the point). */
  topPct?: number;
  /** Lift the card above the anchor instead of sitting at the top edge. */
  above?: boolean;
};

export function ChartTooltip({ title, rows, leftPct, topPct, above }: Props) {
  const clampedX = Math.min(100, Math.max(0, leftPct));
  const shiftX =
    clampedX < 15
      ? "translateX(0)"
      : clampedX > 85
        ? "translateX(-100%)"
        : "translateX(-50%)";
  const shiftY = above
    ? " translateY(-108%)"
    : topPct !== undefined
      ? " translateY(-50%)"
      : "";

  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[136px] rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
      style={{
        left: `${clampedX}%`,
        top: topPct === undefined ? 0 : `${Math.min(100, Math.max(0, topPct))}%`,
        transform: `${shiftX}${shiftY}`,
      }}
    >
      <p className="text-[11px] font-semibold text-slate-500">{title}</p>
      <ul className="mt-1 space-y-1">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
              {row.dotClass || row.dotColor ? (
                <span
                  className={`h-2 w-2 rounded-full ${row.dotClass ?? ""}`}
                  style={
                    row.dotColor ? { backgroundColor: row.dotColor } : undefined
                  }
                />
              ) : null}
              {row.label}
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-slate-900">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
