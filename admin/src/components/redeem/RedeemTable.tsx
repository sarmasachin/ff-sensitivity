import type { ReactNode } from "react";
import type {
  RedeemCadenceRow,
  RedeemListRow,
  RedeemStatus,
  RedeemTypeRow,
} from "./redeem-data";
import {
  IconComments,
  IconEdit,
  IconReveal,
  IconTrash,
  actionBtn,
} from "./RedeemActionIcons";

type Props = {
  rows: RedeemListRow[];
  types?: RedeemTypeRow[];
  cadences?: RedeemCadenceRow[];
  notice?: string | null;
  footer?: ReactNode;
  onEdit?: (id: string) => void;
  onReveal?: (id: string) => void;
  onDelete?: (id: string) => void;
  onComments?: (id: string) => void;
};

function StatusPill({ status }: { status: RedeemStatus }) {
  const map = {
    ACTIVE: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    PAUSED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    EXHAUSTED: "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
    EXPIRED: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
  }[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${map}`}>
      {status}
    </span>
  );
}

function TypePill({
  type,
  label,
}: {
  type: string;
  label?: string;
}) {
  const play = type === "GOOGLE_PLAY";
  return (
    <span
      className={[
        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
        play
          ? "bg-sky-100 text-sky-800 ring-1 ring-sky-200"
          : "bg-fuchsia-100 text-fuchsia-800 ring-1 ring-fuchsia-200",
      ].join(" ")}
    >
      {label ?? type}
    </span>
  );
}

function CadencePill({
  cadence,
  label,
}: {
  cadence: string;
  label?: string;
}) {
  const daily = cadence === "DAILY";
  return (
    <span
      className={[
        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
        daily
          ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200"
          : "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
      ].join(" ")}
    >
      {label ?? cadence}
    </span>
  );
}

export function RedeemTable({
  rows,
  types = [],
  cadences = [],
  notice,
  footer,
  onEdit,
  onReveal,
  onDelete,
  onComments,
}: Props) {
  const typeLabel = Object.fromEntries(types.map((t) => [t.id, t.label]));
  const cadenceLabel = Object.fromEntries(
    cadences.map((c) => [c.id, c.label]),
  );
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {notice ? (
        <p className="border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-[12px] text-amber-900">
          {notice}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Value</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Cadence</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Coins</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Expires</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-4 py-3.5 text-[13px] font-medium text-[#0f172a]">
                  <div className="flex flex-col gap-1">
                    <span>{row.title}</span>
                    {(row.mode ?? "SINGLE") === "SCRATCH_REWARD" ? (
                      <span className="inline-flex w-fit rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                        Scratch · coins
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <TypePill type={row.type} label={typeLabel[row.type]} />
                </td>
                <td className="px-4 py-3.5 text-[13px] font-medium whitespace-nowrap text-teal-700 tabular-nums">
                  {row.valueLabel}
                </td>
                <td className="px-4 py-3.5 font-mono text-[12px] text-slate-600">
                  {row.codeMasked}
                </td>
                <td className="px-4 py-3.5">
                  <CadencePill
                    cadence={row.cadence}
                    label={cadenceLabel[row.cadence]}
                  />
                </td>
                <td className="px-4 py-3.5 text-[13px] font-semibold tabular-nums text-[#0f172a]">
                  <span
                    className={
                      row.stockLeft <= 2 ? "text-amber-600" : "text-emerald-700"
                    }
                  >
                    {row.stockLeft}
                  </span>
                  {(row.mode ?? "SINGLE") === "SCRATCH_REWARD" ? (
                    <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                      pool · {row.codesPerWindow}/{row.windowMinutes}m
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3.5 text-[13px] tabular-nums text-slate-500">
                  {(row.mode ?? "SINGLE") === "SCRATCH_REWARD"
                    ? `${row.coinRewardMin ?? "?"}–${row.coinRewardMax ?? "?"}`
                    : (row.coinCost ?? "—")}
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-4 py-3.5 text-[12px] text-slate-500">
                  {row.expiresLabel}
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <div className="flex flex-nowrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit?.(row.id)}
                      className={actionBtn.edit}
                      aria-label="Edit"
                      title="Edit"
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReveal?.(row.id)}
                      className={actionBtn.reveal}
                      aria-label="Reveal"
                      title="Reveal"
                    >
                      <IconReveal />
                    </button>
                    <button
                      type="button"
                      onClick={() => onComments?.(row.id)}
                      className={actionBtn.comments}
                      aria-label="Comments"
                      title="Comments"
                    >
                      <IconComments />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(row.id)}
                      className={actionBtn.delete}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
