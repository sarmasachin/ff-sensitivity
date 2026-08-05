import { AppError } from '../common/errors/app-error';

// --- Start: Users admin live wire (Sachin) ---
export function sanitizeUserText(raw: string, max: number): string {
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

export function assertSafeUserText(text: string, field: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'USER_UNSAFE_TEXT',
      `${field} contains disallowed content.`,
      400,
    );
  }
}

export function assertUserId(raw: string): string {
  const id = sanitizeUserText(raw, 40);
  if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
    throw new AppError('USER_BAD_ID', 'Invalid user id.', 400);
  }
  return id;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const keep = local.slice(0, 2);
  return `${keep}***@${domain}`;
}

export function maskGoogleSub(googleSub: string): string {
  const clean = sanitizeUserText(googleSub, 128);
  if (clean.length < 4) return 'goog_…****';
  const tip = clean.slice(-4);
  return `goog_…${tip}`;
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

export function formatJoined(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function mapAccountStatus(
  isActive: boolean,
  isRestricted: boolean,
): 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED' {
  if (!isActive) return 'SUSPENDED';
  if (isRestricted) return 'RESTRICTED';
  return 'ACTIVE';
}
// --- End: Users admin live wire (Sachin) ---
