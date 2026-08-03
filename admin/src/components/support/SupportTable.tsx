import {
  SUPPORT_STATUS_LABEL,
  SUPPORT_SUBJECT_LABEL,
  previewSnippet,
  type SupportStatus,
  type SupportSubject,
  type SupportThreadRow,
} from "./support-data";

type Props = {
  rows: SupportThreadRow[];
  onOpen: (id: string) => void;
  onCloseThread: (id: string) => void;
};

const btn =
  "h-8 rounded-lg px-2.5 text-[12px] font-semibold transition-colors";

function statusClass(status: SupportStatus): string {
  switch (status) {
    case "OPEN":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "PENDING_REPLY":
      return "bg-sky-50 text-sky-900 ring-sky-200";
    case "REPLIED":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "CLOSED":
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function subjectClass(subject: SupportSubject): string {
  if (subject === "BUG" || subject === "REPORT") {
    return "bg-rose-50 text-rose-800 ring-rose-200";
  }
  if (subject === "REDEEM_CODE_ISSUE") {
    return "bg-orange-50 text-orange-900 ring-orange-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function SupportTable({ rows, onOpen, onCloseThread }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/90 text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
              <th className="px-4 py-3">Thread</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const snippet = previewSnippet(row);
              return (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-start gap-2">
                      {row.unread ? (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500"
                          title="Unread"
                        />
                      ) : (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {row.name}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-slate-500">
                          {row.email}
                        </p>
                        <p className="mt-1 line-clamp-1 text-[12px] text-slate-400">
                          {snippet}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={[
                        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
                        subjectClass(row.subject),
                      ].join(" ")}
                    >
                      {SUPPORT_SUBJECT_LABEL[row.subject]}
                    </span>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">
                      {row.appVersion}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={[
                        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
                        statusClass(row.status),
                      ].join(" ")}
                    >
                      {SUPPORT_STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-slate-600">
                    {row.updatedAt}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpen(row.id)}
                        className={`${btn} bg-slate-900 text-white hover:bg-slate-800`}
                      >
                        Open
                      </button>
                      {row.status !== "CLOSED" ? (
                        <button
                          type="button"
                          onClick={() => onCloseThread(row.id)}
                          className={`${btn} bg-slate-100 text-slate-700 hover:bg-slate-200`}
                        >
                          Close
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
