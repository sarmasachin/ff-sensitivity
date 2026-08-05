import { AppError } from '../common/errors/app-error';

// --- Start: Wallets admin live wire (Sachin) ---
export const MAX_STAFF_ADJUST = 100_000;
export const MAX_COINS = 9_999_999;

export function sanitizeWalletText(raw: string, max: number): string {
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

export function assertSafeWalletText(text: string, field: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'WALLET_UNSAFE_TEXT',
      `${field} contains disallowed content.`,
      400,
    );
  }
}

export function assertUserId(raw: string): string {
  const id = sanitizeWalletText(raw, 40);
  if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
    throw new AppError('WALLET_BAD_ID', 'Invalid wallet id.', 400);
  }
  return id;
}

export function assertAdjustAmount(n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > MAX_STAFF_ADJUST) {
    throw new AppError(
      'WALLET_BAD_AMOUNT',
      `Amount must be 1–${MAX_STAFF_ADJUST}.`,
      400,
    );
  }
  return n;
}

export function assertRequestId(raw: string): string {
  const id = sanitizeWalletText(raw, 80);
  if (id.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new AppError('WALLET_BAD_REQUEST', 'Invalid request id.', 400);
  }
  return id;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const keep = local.slice(0, 2);
  return `${keep}***@${domain}`;
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

export function mapLedgerKind(
  reason: string,
  delta: number,
): 'EARN' | 'SPEND' | 'GRANT' | 'REVOKE' | 'PURCHASE' | 'ADJUST' {
  const r = reason.toLowerCase();
  if (r.startsWith('staff:grant')) return 'GRANT';
  if (r.startsWith('staff:revoke')) return 'REVOKE';
  if (r.startsWith('staff:')) return 'ADJUST';
  if (r.startsWith('shop:')) return 'PURCHASE';
  if (r.startsWith('earn:')) return 'EARN';
  if (delta < 0) return 'SPEND';
  if (delta > 0) return 'EARN';
  return 'ADJUST';
}

export function mapLedgerActor(
  reason: string,
): 'system' | 'staff' | 'store' {
  const r = reason.toLowerCase();
  if (r.startsWith('staff:')) return 'staff';
  if (r.startsWith('shop:')) return 'store';
  return 'system';
}
// --- End: Wallets admin live wire (Sachin) ---
