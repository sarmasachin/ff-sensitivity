import type { NameFontRow } from "./names-data";

type Props = {
  rows: NameFontRow[];
  onToggle: (id: string) => void;
};

const btn =
  "h-8 rounded-lg px-2.5 text-[12px] font-semibold transition-colors";

export function NamesFontsTable({ rows, onToggle }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-[12px] text-slate-600">
        Letter maps used when the app stylizes each character. Toggle off to
        hide from Android generation.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-white text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
              <th className="px-4 py-3">Font</th>
              <th className="px-4 py-3">Sample</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
              >
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-slate-900">{row.label}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                    {row.id}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-[15px] tracking-wide text-slate-800">
                    {row.sample}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={[
                      "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
                      row.enabled
                        ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                        : "bg-slate-100 text-slate-600 ring-slate-200",
                    ].join(" ")}
                  >
                    {row.enabled ? "Live" : "Off"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => onToggle(row.id)}
                    className={`${btn} bg-teal-50 text-teal-800 hover:bg-teal-100`}
                  >
                    {row.enabled ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
