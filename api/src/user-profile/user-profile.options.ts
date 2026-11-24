export const PROFILE_ROLES = [
  'Rusher',
  'One-Tap Headshot',
  'Sniper',
  'Flanker',
] as const;

export const PROFILE_REGIONS = [
  'India',
  'Brazil',
  'Middle East',
  'Singapore',
  'Indonesia',
  'North America',
  'Europe',
  'Latin America',
] as const;

export function cleanDisplayName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 40) return '';
  if (/[<>]/.test(name)) return '';
  return name;
}

export function cleanFfUid(raw: string): string | null {
  const uid = raw.trim();
  if (!uid) return '';
  if (!/^\d{6,15}$/.test(uid)) return null;
  return uid;
}

export function cleanChoice(raw: string, allowed: readonly string[]): string | null {
  const value = raw.trim();
  if (!value) return '';
  return allowed.includes(value) ? value : null;
}

/** List region or custom label (1–40 chars). Empty clears. */
export function cleanRegion(raw: string): string | null {
  const value = raw.trim().replace(/\s+/g, ' ');
  if (!value) return '';
  if (value.length > 40) return null;
  if (/[<>]/.test(value)) return null;
  if ((PROFILE_REGIONS as readonly string[]).includes(value)) return value;
  return value;
}
