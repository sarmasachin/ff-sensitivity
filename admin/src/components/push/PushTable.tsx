import {
  PUSH_AUDIENCE_LABEL,
  PUSH_STATUS_CLASS,
  PUSH_STATUS_LABEL,
  canCancelCampaign,
  canSendCampaign,
  type PushCampaignRow,
} from "./push-data";

type Props = {
  rows: PushCampaignRow[];
  onEdit: (id: string) => void;
  onSend: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
};

const btn =
  "h-8 rounded-lg px-2.5 text-[12px] font-semibold transition-colors";

export function PushTable({
  rows,
  onEdit,
  onSend,
  onCancel,
  onDelete,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/90 text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-4 py-3">Timing</th>
              <th className="px-4 py-3">Device delivery</th>
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
                  <p className="font-semibold text-slate-900">{row.title}</p>
                  <p className="mt-0.5 max-w-[280px] truncate text-[12px] text-slate-500">
                    {row.body}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">
                    {row.deepLink}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-medium text-slate-800">
                    {PUSH_AUDIENCE_LABEL[row.audience]}
                  </p>
                  {row.topic ? (
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                      {row.topic}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      by {row.createdBy}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3.5 tabular-nums text-[12px] text-slate-600">
                  {row.sentAt ? (
                    <>
                      <p className="text-slate-400">Sent</p>
                      <p>{row.sentAt}</p>
                    </>
                  ) : row.scheduledAt ? (
                    <>
                      <p className="text-slate-400">Scheduled</p>
                      <p>{row.scheduledAt}</p>
                    </>
                  ) : (
                    <p className="text-slate-400">Not queued</p>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  {row.status === "SENT" || row.status === "FAILED" ? (
                    <div className="space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="inline-flex min-w-[4.5rem] text-[11px] font-semibold tracking-wide text-emerald-700 uppercase">
                          Delivered
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-slate-900">
                          {row.delivered.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          device{row.delivered === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="inline-flex min-w-[4.5rem] text-[11px] font-semibold tracking-wide text-rose-600 uppercase">
                          Failed
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-slate-900">
                          {row.failed.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          device{row.failed === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-slate-400">Not sent yet</p>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={[
                      "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
                      PUSH_STATUS_CLASS[row.status],
                    ].join(" ")}
                  >
                    {PUSH_STATUS_LABEL[row.status]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(row.id)}
                      disabled={row.status === "SENT"}
                      className={`${btn} bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      Edit
                    </button>
                    {canSendCampaign(row) ? (
                      <button
                        type="button"
                        onClick={() => onSend(row.id)}
                        className={`${btn} bg-cyan-50 text-cyan-900 hover:bg-cyan-100`}
                      >
                        Send
                      </button>
                    ) : null}
                    {canCancelCampaign(row) ? (
                      <button
                        type="button"
                        onClick={() => onCancel(row.id)}
                        className={`${btn} bg-amber-50 text-amber-900 hover:bg-amber-100`}
                      >
                        Cancel
                      </button>
                    ) : null}
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
