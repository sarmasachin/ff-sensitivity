"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  apiBaseUrl,
  clearAuthStorage,
  fetchAuthMe,
  storeAdminProfile,
} from "@/lib/api";
import { OpsSidebar } from "./OpsSidebar";
import { OpsTopbar } from "./OpsTopbar";

type AdminInfo = {
  email: string;
  role: string;
  allowedModules?: string[];
};

export function OpsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Back/forward cache can restore a signed-out screen: re-verify on restore.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await fetchAuthMe();
      if (cancelled) return;
      if (!me?.email || !me.role) {
        clearAuthStorage();
        setReady(false);
        setAdmin(null);
        window.location.replace("/");
        return;
      }
      const next: AdminInfo = {
        email: me.email,
        role: me.role,
        allowedModules: me.allowedModules,
      };
      const remember = Boolean(
        typeof window !== "undefined" && localStorage.getItem("ffops_admin"),
      );
      storeAdminProfile(next, remember);
      setAdmin((prev) => {
        if (
          prev?.email === next.email &&
          prev?.role === next.role &&
          JSON.stringify(prev.allowedModules ?? []) ===
            JSON.stringify(next.allowedModules ?? [])
        ) {
          return prev;
        }
        return next;
      });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function signOut() {
    setReady(false);
    setAdmin(null);
    try {
      await fetch(`${apiBaseUrl()}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Still clear local hint; cookies may linger if network failed.
    }
    clearAuthStorage();
    // Hard replace: drops this entry from history so Back cannot reach it.
    window.location.replace("/");
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
        allowedModules={admin?.allowedModules}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <OpsTopbar
          onOpenMenu={() => setMobileOpen(true)}
          onSignOut={signOut}
          email={admin?.email}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 sm:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
