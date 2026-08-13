import { AppError } from '../common/errors/app-error';
import { assertInstallId } from '../devices/devices-security';

// --- Start: App analytics P1 live wire (Sachin) ---
export const OPEN_EVENT_NAMES = ['app_open', 'home_open'] as const;

export const ALLOWED_EVENT_NAMES = [
  'app_open',
  'home_open',
  'screen_session',
  'login',
  'logout',
  'redeem_claim',
  'scratch_roll',
  'challenge_quiz_submit',
] as const;

/**
 * Client may only post open pings. Feature events and `logout` are written
 * server-side so ops counters cannot be inflated from the app.
 */
export const CLIENT_EVENT_NAMES = [
  'app_open',
  'home_open',
  'screen_session',
] as const;

export type AllowedEventName = (typeof ALLOWED_EVENT_NAMES)[number];
export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_EVENT_NAMES);
const CLIENT_SET = new Set<string>(CLIENT_EVENT_NAMES);

export function assertEventName(raw: string): AllowedEventName {
  const name = (raw ?? '').trim().toLowerCase();
  if (!ALLOWED_SET.has(name)) {
    throw new AppError(
      'ANALYTICS_BAD_EVENT',
      'Event name is not allowed.',
      400,
    );
  }
  return name as AllowedEventName;
}

export function assertClientEventName(raw: string): ClientEventName {
  const name = assertEventName(raw);
  if (!CLIENT_SET.has(name)) {
    throw new AppError(
      'ANALYTICS_SERVER_ONLY',
      'This event is recorded server-side only.',
      400,
    );
  }
  return name as ClientEventName;
}

export function optionalInstallId(raw?: string | null): string | null {
  if (raw == null || String(raw).trim() === '') return null;
  return assertInstallId(String(raw));
}

export const SCREEN_SESSION_MIN_MS = 1_000;
export const SCREEN_SESSION_MAX_MS = 30 * 60 * 1_000;

/**
 * Screen timing is client-measured, but its shape is server-owned. Keeping
 * only a route slug + bounded duration prevents arbitrary props/PII and caps
 * the impact of a forged or stuck timer.
 */
export function sanitizeScreenSessionProps(
  raw: unknown,
): { screen: string; duration_ms: number } {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError(
      'ANALYTICS_BAD_SCREEN_SESSION',
      'Screen session props are required.',
      400,
    );
  }
  const props = raw as Record<string, unknown>;
  const screen = String(props.screen ?? '')
    .trim()
    .toLowerCase();
  const duration = Number(props.duration_ms);
  if (!/^[a-z][a-z0-9_]{0,31}$/.test(screen)) {
    throw new AppError(
      'ANALYTICS_BAD_SCREEN',
      'Invalid analytics screen.',
      400,
    );
  }
  if (
    !Number.isInteger(duration) ||
    duration < SCREEN_SESSION_MIN_MS ||
    duration > SCREEN_SESSION_MAX_MS
  ) {
    throw new AppError(
      'ANALYTICS_BAD_DURATION',
      'Screen duration is outside the allowed range.',
      400,
    );
  }
  return { screen, duration_ms: duration };
}

/** Strip unsafe / oversized props — never store secrets. */
export function sanitizeProps(
  raw: unknown,
): Record<string, string | number | boolean> | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const out: Record<string, string | number | boolean> = {};
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, 8);
  for (const [k, v] of entries) {
    const key = String(k)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 32);
    if (!key) continue;
    if (
      key.includes('token') ||
      key.includes('password') ||
      key.includes('secret') ||
      key.includes('email')
    ) {
      continue;
    }
    if (typeof v === 'boolean' || typeof v === 'number') {
      if (typeof v === 'number' && !Number.isFinite(v)) continue;
      out[key] = typeof v === 'number' ? Math.max(-1e9, Math.min(1e9, v)) : v;
      continue;
    }
    if (typeof v === 'string') {
      const s = [...v]
        .filter((ch) => {
          const code = ch.codePointAt(0) ?? 0;
          return code >= 0x20 && code !== 0x7f;
        })
        .join('')
        .trim()
        .slice(0, 80);
      if (s) out[key] = s;
    }
  }
  return Object.keys(out).length ? out : null;
}
// --- End: App analytics P1 live wire (Sachin) ---
