import { formatCompact, type DashDonutSlice } from "./dashboard-data";

type Props = {
  slices: DashDonutSlice[];
  rangeLabel: string;
};

function donutPaths(slices: DashDonutSlice[], cx: number, cy: number, r: number, ir: number) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let angle = -Math.PI / 2;
  return slices.map((slice) => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const a1 = angle;
    const a2 = angle + sweep;
    angle = a2;
    const large = sweep > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const ix1 = cx + ir * Math.cos(a2);
    const iy1 = cy + ir * Math.sin(a2);
    const ix2 = cx + ir * Math.cos(a1);
    const iy2 = cy + ir * Math.sin(a1);
    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${ir} ${ir} 0 ${large} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");
    return { id: slice.id, d, color: slice.color };
  });
}

export function DashboardClaimsDonut({ slices, rangeLabel }: Props) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const paths = donutPaths(slices, cx, cy, 94, 56);

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-2xl border border-[#e8eaee] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-amber-700/70 uppercase">
        Outcomes
      </p>
      <h2 className="mt-0.5 text-[17px] font-semibold text-[#0f172a]">
        Claims mix
      </h2>
      <p className="mt-0.5 text-[13px] text-slate-500">{rangeLabel}</p>

      <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label="Claims outcome donut"
          >
            {paths.map((p) => (
              <path key={p.id} d={p.d} fill={p.color} />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[12px] font-medium tracking-wide text-slate-400 uppercase">
              Total
            </p>
            <p className="text-[26px] font-semibold tabular-nums text-slate-900">
              {formatCompact(total)}
            </p>
          </div>
        </div>
        <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2.5">
          {slices.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 text-[14px]"
            >
              <span className="flex items-center gap-2 text-slate-600">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {s.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
