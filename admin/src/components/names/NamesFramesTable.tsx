import { previewTag, type NameFrameRow } from "./names-data";

type Props = {
  rows: NameFrameRow[];
  onEdit: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

const btn =
  "h-8 rounded-lg px-2.5 text-[12px] font-semibold transition-colors";

export function NamesFramesTable({
  rows,
  onEdit,
  onToggle,
  onDelete,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/90 text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
              <th className="px-4 py-3">Frame</th>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">Flags</th>
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
                  <span className="inline-flex max-w-[220px] truncate rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[13px] text-slate-800">
                    {previewTag(row.prefix, "GHOST", row.suffix)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
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
                    {row.premium ? (
                      <span className="inline-flex rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 ring-1 ring-teal-200">
                        Premium
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(row.id)}
                      className={`${btn} bg-slate-100 text-slate-700 hover:bg-slate-200`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggle(row.id)}
                      className={`${btn} bg-teal-50 text-teal-800 hover:bg-teal-100`}
                    >
                      {row.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      className={`${btn} bg-rose-50 text-rose-700 hover:bg-rose-100`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
