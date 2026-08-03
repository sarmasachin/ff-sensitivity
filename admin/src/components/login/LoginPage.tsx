import { LoginCornerCuts } from "./LoginCornerCuts";
import { LoginForm } from "./LoginForm";
import { LoginWelcomePanel } from "./LoginWelcomePanel";

/**
 * Reference visual match (design only). Auth API later.
 */
export function LoginPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6"
      style={{ background: "#3b7ddd" }}
    >
      <div
        className="relative flex w-full max-w-[1020px] overflow-hidden rounded-[28px] bg-white"
        style={{
          minHeight: 620,
          boxShadow: "0 30px 60px rgba(15, 23, 42, 0.28)",
        }}
      >
        <LoginCornerCuts />
        <LoginWelcomePanel />

        <section className="relative flex w-full flex-col justify-center overflow-hidden bg-white px-10 py-12 sm:px-14 lg:w-[56%]">
          {/* Bottom-right corner bubble — solid blue like reference */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-[-90px] bottom-[-100px] z-0 h-[220px] w-[220px] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #60a5fa 0%, #3b82f6 45%, #2563eb 85%)",
            }}
          />

          <header className="relative z-10 mb-8">
            <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-[#3b7ddd] uppercase">
              Staff access
            </p>
            <h2 className="text-[38px] leading-[1.05] font-bold tracking-[-0.035em] text-[#0f172a]">
              Sign in
            </h2>
            <div
              aria-hidden
              className="mt-3 h-[3px] w-10 rounded-full bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]"
            />
            <p className="mt-3.5 max-w-[340px] text-[12.5px] leading-relaxed text-[#64748b]">
              Enter your staff email and password to continue.
            </p>
          </header>

          <div className="relative z-10 w-full max-w-[400px]">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
