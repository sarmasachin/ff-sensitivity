import { AppError } from '../common/errors/app-error';

// --- Start: Push live wire (Sachin) ---
export const ALLOWED_PUSH_DEEP_PATHS = new Set([
  'home',
  'challenge',
  'daily_challenge',
  'scratch',
  'shop',
  'coin_shop',
  'redeem',
  'names',
  'stylish',
  'inbox',
  'notifications',
  'push_inbox',
  // Extra app destinations
  'contact',
  'support',
  'about',
  'share',
  'share_sensi',
  'sensi',
  'hud',
  'graphics',
  'dpi',
]);

export function sanitizePushText(raw: string, max: number): string {
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

export function assertSafePushText(text: string, field: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'PUSH_UNSAFE_TEXT',
      `${field} contains disallowed content.`,
      400,
    );
  }
}

export function assertSafeDeepLink(raw: string): string {
  const link = sanitizePushText(raw, 120).toLowerCase();
  let parsed: URL;
  try {
    parsed = new URL(link);
  } catch {
    throw new AppError('PUSH_BAD_LINK', 'Deep link is invalid.', 400);
  }
  if (parsed.protocol !== 'ffops:') {
    throw new AppError(
      'PUSH_BAD_LINK',
      'Deep link must use the ffops:// scheme.',
      400,
    );
  }
  if (parsed.username || parsed.password) {
    throw new AppError(
      'PUSH_BAD_LINK',
      'Deep link must not include credentials.',
      400,
    );
  }
  const path = (parsed.hostname || parsed.pathname.replace(/^\//, ''))
    .split('/')[0]
    ?.replace(/[^a-z0-9_]/g, '');
  if (!path || !ALLOWED_PUSH_DEEP_PATHS.has(path)) {
    throw new AppError(
      'PUSH_BAD_LINK',
      'Deep link path is not allowlisted.',
      400,
    );
  }
  return `ffops://${path}`;
}

export function assertTopic(raw: string): string {
  const topic = sanitizePushText(raw, 64).toLowerCase();
  if (!/^[a-z0-9_]{1,64}$/.test(topic)) {
    throw new AppError(
      'PUSH_BAD_TOPIC',
      'Topic must be snake_case alphanumeric.',
      400,
    );
  }
  return topic;
}

export function parseStamp(raw: string): Date {
  const m = raw
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) {
    throw new AppError('PUSH_BAD_STAMP', 'Invalid schedule stamp.', 400);
  }
  const [, y, mo, d, h, mi] = m;
  const dt = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    0,
    0,
  );
  if (!Number.isFinite(dt.getTime())) {
    throw new AppError('PUSH_BAD_STAMP', 'Invalid schedule stamp.', 400);
  }
  return dt;
}

export function stamp(d: Date | null | undefined): string | null {
  if (!d) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// --- End: Push live wire (Sachin) ---
