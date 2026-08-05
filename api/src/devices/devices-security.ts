import { AppError } from '../common/errors/app-error';

// --- Start: Devices live wire (Sachin) ---
export const STALE_HOURS = 72;

export function sanitizeDeviceText(raw: string, max: number): string {
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

export function assertSafeDeviceText(text: string, field: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'DEVICE_UNSAFE_TEXT',
      `${field} contains disallowed content.`,
      400,
    );
  }
}

/** Stable install ids from Android — not forgeable into admin row ids. */
export function assertInstallId(raw: string): string {
  const id = sanitizeDeviceText(raw, 64).toLowerCase();
  if (!/^dev_[a-z0-9]{8,40}$/.test(id)) {
    throw new AppError(
      'DEVICE_BAD_INSTALL_ID',
      'Install id must look like dev_<hex>.',
      400,
    );
  }
  return id;
}

export function maskFcmToken(token: string): string {
  const t = token.trim();
  if (t.length < 8) return '—';
  return `fcm_…${t.slice(-4)} · ****${t.slice(-4)}`;
}

export function tokenHintFromFull(token: string): string {
  const t = token.trim();
  if (t.length < 8) return '';
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export function hoursAgo(from: Date, now = new Date()): number {
  return Math.max(0, (now.getTime() - from.getTime()) / 3_600_000);
}

export function formatLastSeen(hours: number): string {
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins} min ago`;
  }
  if (hours < 48) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function computeDeviceStatus(opts: {
  blocked: boolean;
  lastSeenAt: Date;
  now?: Date;
}): 'ACTIVE' | 'STALE' | 'BLOCKED' {
  if (opts.blocked) return 'BLOCKED';
  const h = hoursAgo(opts.lastSeenAt, opts.now);
  return h > STALE_HOURS ? 'STALE' : 'ACTIVE';
}
// --- End: Devices live wire (Sachin) ---
