import type { ProfileSessionInfo } from "./profile-data";
import { roleLabel } from "./profile-data";

type Props = {
  session: ProfileSessionInfo;
};

function moduleLabel(id: string) {
  return id
    .replace(/^\/+/, "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProfileAccessCard({ session }: Props) {
  const modules =
    session.allowedModules.length > 0
      ? session.allowedModules
      : session.role === "SUPER_ADMIN" || session.role === "ADMIN"
        ? ["*"]
        : [];

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-indigo-800 uppercase">
        Access
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Seat & module ACL
      </h2>
      <p className="mt-0.5 max-w-2xl text-[12px] text-slate-500">
        Read-only snapshot from the signed-in admin blob. Change seats and
        modules on Staff — not here.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-3">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            Role
          </p>
          <p className="mt-1 text-[15px] font-semibold text-slate-900">
            {roleLabel(session.role)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-3">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            Admin ID
          </p>
          <p className="mt-1 truncate font-mono text-[13px] font-medium text-slate-800">
            {session.adminId || "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-3">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            Storage
          </p>
          <p className="mt-1 text-[15px] font-semibold text-slate-900">
            {session.storageScope === "session"
              ? "Session only"
              : session.storageScope === "local"
                ? "Remembered device"
                : "Unknown"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
          Allowed modules
        </p>
        {modules.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate-500">
            No module list on this token. Restrict via Staff when Nest ACL is
            wired.
          </p>
        ) : modules[0] === "*" ? (
          <p className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2.5 text-[13px] font-medium text-indigo-950">
            Full console access for {roleLabel(session.role)}.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {modules.map((m) => (
              <li
                key={m}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700"
              >
                {moduleLabel(m)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
