import { AppError } from '../common/errors/app-error';

// --- Start: Admin profile live wire (Sachin) ---
export type AdminProfileView = {
  id: string;
  email: string;
  role: string;
  allowedModules: string[];
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  displayName: string;
  jobTitle: string;
  deskLabel: string;
  notifyEmail: string;
  phone: string;
  timezoneLabel: string;
  digestDaily: boolean;
  digestSecurity: boolean;
};

export function sanitizeProfileText(raw: string, max: number): string {
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

export function assertSafeProfileText(text: string, field: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'PROFILE_UNSAFE_TEXT',
      `${field} contains disallowed content.`,
      400,
    );
  }
}

export function assertPhone(phone: string) {
  if (!phone) return;
  if (!/^[+\d][\d\s()-]{6,30}$/.test(phone)) {
    throw new AppError('PROFILE_BAD_PHONE', 'Phone format looks invalid.', 400);
  }
}

export function defaultDisplayName(email: string): string {
  const local = email.split('@')[0] ?? 'Operator';
  const pretty = local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return pretty || 'Operator';
}

export function toProfileView(admin: {
  id: string;
  email: string;
  role: string;
  allowedModules: string[];
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  displayName: string | null;
  jobTitle: string | null;
  deskLabel: string | null;
  notifyEmail: string | null;
  phone: string | null;
  timezoneLabel: string | null;
  digestDaily: boolean;
  digestSecurity: boolean;
}): AdminProfileView {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    allowedModules: admin.allowedModules,
    mustChangePassword: admin.mustChangePassword,
    lastLoginAt: admin.lastLoginAt,
    displayName: admin.displayName?.trim() || defaultDisplayName(admin.email),
    jobTitle: admin.jobTitle?.trim() || 'Staff',
    deskLabel: admin.deskLabel?.trim() || 'FF Sensitivity Ops',
    notifyEmail: admin.notifyEmail?.trim() || admin.email,
    phone: admin.phone?.trim() || '',
    timezoneLabel: admin.timezoneLabel?.trim() || 'Asia/Kolkata (IST)',
    digestDaily: admin.digestDaily,
    digestSecurity: admin.digestSecurity,
  };
}
// --- End: Admin profile live wire (Sachin) ---
