/** Shared admin API helpers — session via httpOnly cookies (credentials). */

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export function clearAuthStorage() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("ffops_access_token");
  sessionStorage.removeItem("ffops_admin");
  localStorage.removeItem("ffops_access_token");
  localStorage.removeItem("ffops_admin");
}

/** Persist non-secret admin profile hint for UI ACL (not a credential). */
export function storeAdminProfile(
  admin: { email: string; role: string; allowedModules?: string[] },
  remember = false,
) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(admin);
  // Prefer sessionStorage; Remember me keeps profile hint in localStorage only.
  if (remember) {
    localStorage.setItem("ffops_admin", payload);
    sessionStorage.removeItem("ffops_admin");
  } else {
    sessionStorage.setItem("ffops_admin", payload);
    localStorage.removeItem("ffops_admin");
  }
  // Never keep JWTs in web storage.
  sessionStorage.removeItem("ffops_access_token");
  localStorage.removeItem("ffops_access_token");
}

export type ApiErrorShape = {
  error?: { code?: string; message?: string };
};

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${apiBaseUrl()}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return false;
      const data = (await res.json().catch(() => null)) as {
        admin?: { email: string; role: string; allowedModules?: string[] };
      } | null;
      if (data?.admin) {
        const remember = Boolean(localStorage.getItem("ffops_admin"));
        storeAdminProfile(data.admin, remember);
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function forceSignIn() {
  clearAuthStorage();
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  retried = false,
): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  const raw = await res.text();
  let data: (T & ApiErrorShape) | ApiErrorShape | null = null;
  if (raw) {
    try {
      data = JSON.parse(raw) as (T & ApiErrorShape) | ApiErrorShape;
    } catch {
      data = null;
    }
  }

  if (res.status === 401 && !retried && !path.includes("/auth/refresh")) {
    const ok = await tryRefreshSession();
    if (ok) return apiFetch<T>(path, init, true);
    forceSignIn();
    throw new ApiClientError(
      401,
      "AUTH_REQUIRED",
      "Session expired or invalid. Sign in again.",
    );
  }

  if (!res.ok) {
    const code =
      data && typeof data === "object" && "error" in data
        ? data.error?.code || `HTTP_${res.status}`
        : `HTTP_${res.status}`;
    let message =
      data && typeof data === "object" && "error" in data
        ? data.error?.message
        : undefined;

    if (
      typeof message === "string" &&
      (message.startsWith("Cannot GET") ||
        message.startsWith("Cannot POST") ||
        message.startsWith("Cannot PUT"))
    ) {
      message =
        "Nest API is missing this route (old process or not rebuilt). Restart the API on port 4000, then refresh.";
    } else if (
      !message &&
      (raw.startsWith("Cannot GET") || raw.startsWith("Cannot POST"))
    ) {
      message =
        "Nest API is missing this route (old process or not rebuilt). Restart the API on port 4000, then refresh.";
    }

    if (res.status === 401) {
      forceSignIn();
      message = "Session expired or invalid. Sign in again.";
    } else if (res.status === 403) {
      message =
        message ||
        "You do not have access to this module. Ask a Super Admin.";
    }

    throw new ApiClientError(
      res.status,
      String(code),
      message ||
        (raw.trim()
          ? raw.trim().slice(0, 180)
          : `Request failed (${res.status})`),
    );
  }

  if (!raw) {
    return undefined as T;
  }
  if (!data) {
    throw new ApiClientError(
      res.status,
      "BAD_JSON",
      "API returned a non-JSON response. Check NEXT_PUBLIC_API_URL points at Nest.",
    );
  }
  return data as T;
}

/** Cookie-session probe used by OpsShell. */
export async function fetchAuthMe(): Promise<{
  email: string;
  role: string;
  allowedModules?: string[];
} | null> {
  try {
    const res = await fetch(`${apiBaseUrl()}/api/v1/auth/me`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (res.status === 401) {
      const ok = await tryRefreshSession();
      if (!ok) return null;
      const retry = await fetch(`${apiBaseUrl()}/api/v1/auth/me`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!retry.ok) return null;
      return (await retry.json()) as {
        email: string;
        role: string;
        allowedModules?: string[];
      };
    }
    if (!res.ok) return null;
    return (await res.json()) as {
      email: string;
      role: string;
      allowedModules?: string[];
    };
  } catch {
    return null;
  }
}
