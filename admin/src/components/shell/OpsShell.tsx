"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OpsSidebar } from "./OpsSidebar";
import { OpsTopbar } from "./OpsTopbar";

type AdminInfo = {
  email: string;
  role: string;
};

function readAuth(): { token: string | null; admin: AdminInfo | null } {
  const token =
    sessionStorage.getItem("ffops_access_token") ??
    localStorage.getItem("ffops_access_token");
  const raw =
    sessionStorage.getItem("ffops_admin") ?? localStorage.getItem("ffops_admin");
  let admin: AdminInfo | null = null;
  if (raw) {
    try {
      admin = JSON.parse(raw) as AdminInfo;
    } catch {
      admin = null;
    }
  }
  return { token, admin };
}

function clearAuth() {
  sessionStorage.removeItem("ffops_access_token");
  sessionStorage.removeItem("ffops_admin");
  localStorage.removeItem("ffops_access_token");
  localStorage.removeItem("ffops_admin");
}

export function OpsShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const { token, admin: stored } = readAuth();
    if (!token) {
      setReady(false);
      router.replace("/");
      return;
    }
    setAdmin((prev) => {
      if (prev?.email === stored?.email && prev?.role === stored?.role) {
        return prev;
      }
      return stored;
    });
    setReady(true);
  }, [router, pathname]);

  async function signOut() {
    clearAuth();
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    try {
      await fetch(`${apiBase}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    router.replace("/");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-[13px] text-[#64748b]">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f8fafc] text-[#0f172a]">
      <OpsSidebar
        email={admin?.email}
        role={admin?.role}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <OpsTopbar
          onOpenMenu={() => setMobileOpen(true)}
          onSignOut={signOut}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 sm:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
