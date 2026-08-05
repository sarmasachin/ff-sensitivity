export function ClaimsPolicyCard() {
  return (
    <section className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/50 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-sky-700 uppercase">
        Claim rule
      </p>
      <h2 className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-slate-900">
        Unlock = claim (live app)
      </h2>
      <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-slate-600">
        Android scratch unlock calls{" "}
        <span className="font-semibold text-slate-800">
          POST /api/v1/redeem/:id/claim
        </span>
        . Stock is consumed then — Copy only puts the code on the clipboard.
        This ledger shows those Nest claim rows.
      </p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { step: "1", title: "Unlock", body: "Scratch win on device" },
          { step: "2", title: "Claim API", body: "Nest writes RedeemClaim" },
          { step: "3", title: "Ledger", body: "Shows here for staff review" },
        ].map((item) => (
          <li
            key={item.step}
            className="flex items-start gap-3 rounded-xl border border-sky-100 bg-white/80 px-3.5 py-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-[12px] font-bold text-white">
              {item.step}
            </span>
            <div>
              <p className="text-[13px] font-semibold text-slate-900">
                {item.title}
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
