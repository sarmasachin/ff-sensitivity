export function canAccessChallengeModule(): boolean {
  if (typeof window === "undefined") return false;
  const raw =
    sessionStorage.getItem("ffops_admin") ?? localStorage.getItem("ffops_admin");
  if (!raw) return false;
  try {
    const admin = JSON.parse(raw) as {
      role?: string;
      allowedModules?: string[];
    };
    if (admin.role === "SUPER_ADMIN") return true;
    return Array.isArray(admin.allowedModules)
      ? admin.allowedModules.includes("daily_challenge") ||
          admin.allowedModules.includes("challenge")
      : false;
  } catch {
    return false;
  }
}

export function snapshotRulesKey(rules: unknown) {
  return JSON.stringify(rules);
}
