import {
  STAFF_MODULE_META,
  STAFF_ROLE_LABEL,
  STAFF_STATUS_LABEL,
  type StaffListRow,
  type StaffModuleId,
} from "./staff-data";

type Props = {
  open: boolean;
  row: StaffListRow | null;
  onClose: () => void;
  onDisable: (id: string) => void;
  onEnable: (id: string) => void;
  onResend: (id: string) => void;
  onToggleModule: (id: string, moduleId: StaffModuleId) => void;
};

export function StaffDetailDrawer({
  open,
  row,
  onClose,
  onDisable,
  onEnable,
  onResend,
  onToggleModule,
}: Props) {
  if (!open || !row) return null;

  const locked = row.role === "SUPER_ADMIN";
  const appMods = STAFF_MODULE_META.filter((m) => m.group === "app");
  const sysMods = STAFF_MODULE_META.filter((m) => m.group === "system");

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 uppercase">
              Staff detail
            </p>
            <h2 className="mt-1 truncate text-[18px] font-bold tracking-[-0.02em] text-slate-900">
              {row.name}
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">{row.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-3 text-[12px] font-medium text-zinc-900">
            {STAFF_ROLE_LABEL[row.role]} · {STAFF_STATUS_LABEL[row.status]} ·
            invited {row.invitedAtLabel}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Last login
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {row.lastLoginLabel}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Modules
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                {row.modules.length}
              </dd>
            </div>
          </dl>

          <p className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Ops note
          </p>
          <p className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-3.5 py-3 text-[13px] leading-relaxed text-slate-700">
            {row.note}
          </p>

          <p className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            App modules
          </p>
          <ul className="grid grid-cols-2 gap-1.5">
            {appMods.map((m) => {
              const on = row.modules.includes(m.id);
              return (
                <li key={m.id}>
                  <label
                    className={[
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px]",
                      on
                        ? "border-zinc-300 bg-zinc-50 font-semibold text-zinc-900"
                        : "border-slate-100 text-slate-500",
                      locked ? "cursor-not-allowed opacity-60" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={locked}
                      onChange={() => onToggleModule(row.id, m.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-zinc-800"
                    />
                    {m.label}
                  </label>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            System modules
          </p>
          <ul className="grid grid-cols-2 gap-1.5">
            {sysMods.map((m) => {
              const on = row.modules.includes(m.id);
              return (
                <li key={m.id}>
                  <label
                    className={[
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px]",
                      on
                        ? "border-zinc-300 bg-zinc-50 font-semibold text-zinc-900"
                        : "border-slate-100 text-slate-500",
                      locked ? "cursor-not-allowed opacity-60" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={locked}
                      onChange={() => onToggleModule(row.id, m.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-zinc-800"
                    />
                    {m.label}
                  </label>
                </li>
              );
            })}
          </ul>
          {locked ? (
            <p className="mt-3 text-[11px] text-slate-400">
              Super Admin module set is locked.
            </p>
          ) : null}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
          {row.status === "INVITED" ? (
            <button
              type="button"
              onClick={() => onResend(row.id)}
              className="h-10 flex-1 rounded-xl bg-amber-50 px-3 text-[13px] font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
            >
              Resend invite
            </button>
          ) : null}
          {!locked && row.status === "DISABLED" ? (
            <button
              type="button"
              onClick={() => onEnable(row.id)}
              className="h-10 flex-1 rounded-xl bg-emerald-600 px-3 text-[13px] font-semibold text-white hover:bg-emerald-500"
            >
              Enable account
            </button>
          ) : null}
          {!locked &&
          (row.status === "ACTIVE" || row.status === "INVITED") ? (
            <button
              type="button"
              onClick={() => onDisable(row.id)}
              className="h-10 flex-1 rounded-xl bg-rose-600 px-3 text-[13px] font-semibold text-white hover:bg-rose-500"
            >
              Disable account
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}
