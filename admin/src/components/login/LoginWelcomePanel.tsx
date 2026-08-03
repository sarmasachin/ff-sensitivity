export function LoginWelcomePanel() {
  return (
    <aside className="relative z-10 hidden min-h-[620px] w-[44%] overflow-hidden rounded-r-[72px] text-white lg:block">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #1a56c4 0%, #1e63d8 45%, #2458c0 100%)",
        }}
      />

      {/* Soft glow orbs — kept inside left panel only */}
      <div
        aria-hidden
        className="absolute -top-28 -left-24 h-[280px] w-[280px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, rgba(186,230,253,0.5) 0%, rgba(37,99,235,0.2) 45%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-[12%] right-[-40px] h-[200px] w-[200px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(125,211,252,0.45) 0%, rgba(37,99,235,0.25) 50%, transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-[-90px] left-[-36px] h-[260px] w-[260px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 45% 35%, rgba(96,165,250,0.55) 0%, rgba(30,64,175,0.4) 55%, transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="absolute right-[8%] bottom-[16%] h-[150px] w-[150px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 34% 32%, rgba(147,197,253,0.55) 0%, rgba(37,99,235,0.4) 55%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-[40%] left-[20%] h-[120px] w-[120px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, rgba(191,219,254,0.3) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex h-full min-h-[620px] flex-col justify-center px-12 py-16 xl:px-14">
        <p className="text-[40px] leading-none font-extrabold tracking-[0.08em] uppercase">
          Welcome
        </p>
        <p className="mt-3 text-[15px] font-bold tracking-[0.1em] uppercase">
          FF Sensitivity Ops
        </p>
        <p className="mt-8 max-w-[250px] text-[11px] leading-[1.75] text-white/80">
          Staff console for redeem inventory, claims, and release operations.
          Sign in with your invited account to continue.
        </p>
      </div>
    </aside>
  );
}
