import { AppError } from '../common/errors/app-error';

// --- Start: App remote config live wire (Sachin) ---
export const APP_FEATURE_KEYS = [
  'redeem',
  'shop',
  'challenge',
  'scratch',
  'share',
  'names',
  'community',
  'support',
] as const;

export const APP_NAV_KEYS = [
  'homeRedeem',
  'homeShop',
  'homeChallenge',
  'homeScratch',
  'homeNames',
  'homeShare',
  'navCommunity',
  'navSupport',
  'navAbout',
] as const;

export function sanitizeText(raw: string, max: number): string {
  return [...(raw ?? '')]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) return false;
      if (code >= 0x200b && code <= 0x200f) return false;
      if (code === 0xfeff) return false;
      return true;
    })
    .join('')
    .trim()
    .slice(0, max);
}

export function assertSafeText(text: string, field: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'APP_UNSAFE_TEXT',
      `${field} contains disallowed content.`,
      400,
    );
  }
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) {
    return true;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split('.').map((n) => Number(n));
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  // IPv6 literals only — never match DNS labels like "fda.gov" / "fc.*" hosts.
  if (h.includes(':')) {
    if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
      return true;
    }
  }
  return false;
}

export function assertSafeHttpsUrl(raw: string, field: string): string {
  const url = sanitizeText(raw, 300);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('APP_BAD_URL', `${field} is invalid.`, 400);
  }
  if (parsed.protocol !== 'https:') {
    throw new AppError('APP_BAD_URL', `${field} must use https.`, 400);
  }
  if (parsed.username || parsed.password) {
    throw new AppError('APP_BAD_URL', `${field} must not include credentials.`, 400);
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new AppError('APP_BAD_URL', `${field} host is not allowed.`, 400);
  }
  return parsed.toString();
}

export function normalizeBoolMap(
  raw: Record<string, unknown> | null | undefined,
  keys: readonly string[],
  fallbackTrue = true,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of keys) {
    const v = raw?.[k];
    out[k] = typeof v === 'boolean' ? v : fallbackTrue;
  }
  return out;
}

export const DEFAULT_APP_CONFIG = {
  status: {
    maintenanceMode: false,
    maintenanceMessage:
      'We are performing scheduled maintenance. Please try again shortly.',
    forceUpdate: false,
    softUpdatePrompt: true,
    minVersionCode: 1,
    minVersionName: '1.0.0',
  },
  features: Object.fromEntries(APP_FEATURE_KEYS.map((k) => [k, true])) as Record<
    string,
    boolean
  >,
  navigation: Object.fromEntries(APP_NAV_KEYS.map((k) => [k, true])) as Record<
    string,
    boolean
  >,
  links: {
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.ffsensitivity.app',
    privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
    websiteUrl: 'https://sensitivitysettings.com',
    supportEmail: 'support@sensitivitysettings.com',
  },
};
// --- End: App remote config live wire (Sachin) ---
