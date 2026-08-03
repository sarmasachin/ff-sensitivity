import type { DashPoint } from "./dashboard-data";

type Props = {
  points: DashPoint[];
  rangeLabel: string;
};

function buildPath(
  values: number[],
  max: number,
  w: number,
  h: number,
  padX: number,
  padY: number,
): string {
  if (values.length === 0) return "";
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const step = values.length === 1 ? 0 : innerW / (values.length - 1);
  return values
    .map((v, i) => {
      const x = padX + i * step;
      const y = padY + innerH - (v / max) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function DashboardTrendCard({ points, rangeLabel }: Props) {
  const w = 720;
  const h = 320;
  const padX = 16;
  const padY = 24;
  const max = Math.max(
    1,
    ...points.flatMap((p) => [p.claims, p.redeems]),
  );
  const claims = points.map((p) => p.claims);
  const redeems = points.map((p) => p.redeems);
  const claimsLine = buildPath(claims, max, w, h, padX, padY);
  const redeemsLine = buildPath(redeems, max, w, h, padX, padY);
  const areaClose = `${padX + (points.length > 1 ? ((w - padX * 2) / (points.length - 1)) * (points.length - 1) : 0)},${h - padY} L${padX},${h - padY} Z`;
  const claimsArea = `${claimsLine} L${areaClose}`;

  const totalClaims = claims.reduce((a, b) => a + b, 0);
  const totalRedeems = redeems.reduce((a, b) => a + b, 0);

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-2xl border border-[#e8eaee] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-sky-700/70 uppercase">
            Trend
          </p>
          <h2 className="mt-0.5 text-[17px] font-semibold text-[#0f172a]">
            Claims vs redeems
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">{rangeLabel}</p>
        </div>
        <div className="flex gap-4 text-[13px]">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            Claims · {totalClaims}
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Redeems · {totalRedeems}
          </span>
        </div>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-[280px] w-full"
          role="img"
          aria-label="Claims and redeems trend chart"
        >
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={padX}
              x2={w - padX}
              y1={padY + (h - padY * 2) * (1 - t)}
              y2={padY + (h - padY * 2) * (1 - t)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          ))}
          <path d={claimsArea} fill="rgba(14,165,233,0.12)" />
          <path
            d={claimsLine}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={redeemsLine}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="0"
          />
        </svg>
        <div className="mt-2 flex justify-between px-1">
          {points.map((p) => (
            <span
              key={p.label}
              className="text-[11px] font-medium text-slate-400 tabular-nums"
            >
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
