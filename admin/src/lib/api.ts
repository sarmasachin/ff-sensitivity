/** Shared admin API helpers — token from login storage. */

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export function readAccessToken(): string {
  if (typeof window === "undefined") return "";
  return (
    sessionStorage.getItem("ffops_access_token") ??
    localStorage.getItem("ffops_access_token") ??
    ""
  );
}

export function clearAuthStorage() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("ffops_access_token");
  sessionStorage.removeItem("ffops_admin");
  localStorage.removeItem("ffops_access_token");
  localStorage.removeItem("ffops_admin");
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

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = readAccessToken();
  if (!token) {
    throw new ApiClientError(401, "AUTH_REQUIRED", "Sign in required.");
  }
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
      (message.startsWith("Cannot GET") || message.startsWith("Cannot POST") || message.startsWith("Cannot PUT"))
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
      clearAuthStorage();
      message =
        "Session expired or invalid. Sign in again, then open Claims.";
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } else if (res.status === 403) {
      message =
        message ||
        "You do not have access to this module. Ask a Super Admin.";
    }

    throw new ApiClientError(
      res.status,
      String(code),
      message || (raw.trim() ? raw.trim().slice(0, 180) : `Request failed (${res.status})`),
    );
  }

  if (!raw) {
    return undefined as T;
  }
  if (!data) {
    throw new ApiClientError(
      res.status,
      "BAD_JSON",
      "API returned a non-JSON response. Check NEXT_PUBLIC_API_URL points at Nest :4000.",
    );
  }
  return data as T;
}
