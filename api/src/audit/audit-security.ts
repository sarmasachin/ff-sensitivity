import { AppError } from '../common/errors/app-error';

// --- Start: Audit admin live wire (Sachin) ---
export type AuditCategory =
  | 'LOGIN'
  | 'REDEEM'
  | 'INVENTORY'
  | 'STAFF'
  | 'WALLET'
  | 'CONFIG'
  | 'DEVICE';

export type AuditResult = 'SUCCESS' | 'DENIED' | 'FAILED';

const SECRET_KEYS = new Set([
  'password',
  'passwordhash',
  'temporarypassword',
  'temppassword',
  'secret',
  'code',
  'codesecret',
  'plaincode',
  'rawcode',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'apikey',
  'privatekey',
  'authorization',
  'phone',
  'mobile',
  'phonenumber',
]);

/** Keys that look like emails even when the field name is not exactly `email`. */
function looksLikeEmailKey(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes('email') || k === 'mail';
}

export function hoursAgo(from: Date, now = new Date()): number {
  return Math.max(0, (now.getTime() - from.getTime()) / 3_600_000);
}

export function formatWhen(hours: number): string {
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins} min ago`;
  }
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const keep = local.slice(0, 2);
  return `${keep}***@${domain}`;
}

export function mapCategory(action: string): AuditCategory {
  const a = (action ?? '').toLowerCase();
  if (a.startsWith('auth.') || a.includes('login')) return 'LOGIN';
  if (a.startsWith('staff:')) return 'STAFF';
  if (a.startsWith('wallets.') || a.startsWith('wallet')) return 'WALLET';
  if (a.startsWith('devices.') || a.startsWith('device')) return 'DEVICE';
  if (a.startsWith('claims.') || a.startsWith('redeem')) return 'REDEEM';
  if (a.startsWith('inventory') || a.includes('stock')) return 'INVENTORY';
  return 'CONFIG';
}

export function mapResult(action: string, after: unknown): AuditResult {
  const a = (action ?? '').toLowerCase();
  if (a.includes('denied') || a.includes('forbidden')) return 'DENIED';
  if (a.includes('fail') || a.includes('invalid')) return 'FAILED';
  if (after && typeof after === 'object' && !Array.isArray(after)) {
    const obj = after as Record<string, unknown>;
    if (obj.ok === false || obj.success === false) return 'FAILED';
    if (obj.denied === true) return 'DENIED';
  }
  return 'SUCCESS';
}

export function humanAction(action: string): string {
  const map: Record<string, string> = {
    'auth.login': 'Session start',
    'auth.profile_update': 'Profile update',
    'auth.password_change': 'Password change',
    'staff:invite': 'Invite sent',
    'staff:modules': 'Modules updated',
    'staff:disable': 'Staff disabled',
    'staff:enable': 'Staff enabled',
    'staff:resend_invite': 'Invite resent',
    'app.config_save': 'App config save',
    'copy.config_save': 'Copy config save',
    'wallets.grant': 'Grant coins',
    'wallets.revoke': 'Revoke coins',
    'wallets.freeze': 'Wallet freeze',
    'wallets.unfreeze': 'Wallet unfreeze',
  };
  if (map[action]) return map[action];
  // staff:invite → Invite · wallets.grant → Grant
  const cleaned = action.replace(/^[a-z_]+:?/i, '').replace(/[._]/g, ' ').trim();
  if (!cleaned) return action || 'Event';
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractIp(after: unknown): string {
  if (!after || typeof after !== 'object' || Array.isArray(after)) return '—';
  const obj = after as Record<string, unknown>;
  const ip = obj.ip ?? obj.clientIp ?? obj.remoteAddress;
  if (typeof ip === 'string' && ip.trim()) return ip.trim().slice(0, 64);
  return '—';
}

function redactValue(key: string, value: unknown): unknown {
  const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (SECRET_KEYS.has(k)) {
    return '[redacted]';
  }
  if (typeof value === 'string' && value.includes('@') && looksLikeEmailKey(key)) {
    return maskEmail(value);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return redactObject(value as Record<string, unknown>);
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => redactValue(String(i), v));
  }
  if (typeof value === 'string' && value.length > 120) {
    return `${value.slice(0, 117)}…`;
  }
  return value;
}

export function redactObject(
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!raw) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = redactValue(k, v);
  }
  return out;
}

export function summarizeDetail(
  before: unknown,
  after: unknown,
  max = 280,
): string {
  const b =
    before && typeof before === 'object'
      ? redactObject(before as Record<string, unknown>)
      : null;
  const a =
    after && typeof after === 'object'
      ? redactObject(after as Record<string, unknown>)
      : null;
  if (!b && !a) return '—';
  let text: string;
  try {
    if (b && a) text = `${JSON.stringify(b)} → ${JSON.stringify(a)}`;
    else text = JSON.stringify(a ?? b);
  } catch {
    return '—';
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function assertAuditLimit(n: number): number {
  if (!Number.isFinite(n) || n < 1 || n > 500) {
    throw new AppError('AUDIT_BAD_LIMIT', 'Limit must be 1–500.', 400);
  }
  return Math.floor(n);
}
// --- End: Audit admin live wire (Sachin) ---
