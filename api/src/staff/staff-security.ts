import { randomBytes } from 'crypto';
import { AdminModule, AdminRole } from '@prisma/client';
import { AppError } from '../common/errors/app-error';

// --- Start: Staff admin live wire (Sachin) ---
export const ASSIGNABLE_MODULES: AdminModule[] = [
  AdminModule.redeem,
  AdminModule.shop,
  AdminModule.community,
  AdminModule.claims,
  AdminModule.daily_challenge,
  AdminModule.scratch,
  AdminModule.names,
  AdminModule.support,
  AdminModule.promos,
  AdminModule.push,
  AdminModule.app,
  AdminModule.devices,
  AdminModule.wallets,
  AdminModule.users,
  AdminModule.copy,
  AdminModule.staff,
  AdminModule.audit,
  AdminModule.settings,
  AdminModule.overview,
];

export const INVITE_ROLES: AdminRole[] = [
  AdminRole.ADMIN,
  AdminRole.SUB_ADMIN,
  AdminRole.VIEWER,
];

export function sanitizeStaffText(raw: string, max: number): string {
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

export function assertSafeStaffText(text: string, field: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'STAFF_UNSAFE_TEXT',
      `${field} contains disallowed content.`,
      400,
    );
  }
}

export function assertStaffId(raw: string): string {
  const id = sanitizeStaffText(raw, 40);
  if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
    throw new AppError('STAFF_BAD_ID', 'Invalid staff id.', 400);
  }
  return id;
}

export function assertStaffEmail(raw: string): string {
  const email = sanitizeStaffText(raw, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('STAFF_BAD_EMAIL', 'Enter a valid email.', 400);
  }
  return email;
}

/** Map UI aliases → Prisma AdminModule; drop unknowns. */
export function normalizeModules(raw: unknown): AdminModule[] {
  if (!Array.isArray(raw)) {
    throw new AppError('STAFF_BAD_MODULES', 'Modules must be an array.', 400);
  }
  const out = new Set<AdminModule>();
  for (const item of raw) {
    const key = String(item ?? '').trim();
    const mapped =
      key === 'challenge' ? AdminModule.daily_challenge : (key as AdminModule);
    if (!ASSIGNABLE_MODULES.includes(mapped)) {
      throw new AppError(
        'STAFF_BAD_MODULES',
        `Unknown or disallowed module: ${key}`,
        400,
      );
    }
    out.add(mapped);
  }
  if (out.size === 0) {
    throw new AppError(
      'STAFF_BAD_MODULES',
      'Assign at least one module.',
      400,
    );
  }
  return [...out];
}

export function assertInviteRole(raw: string): AdminRole {
  const role = sanitizeStaffText(raw, 20) as AdminRole;
  if (!INVITE_ROLES.includes(role)) {
    throw new AppError(
      'STAFF_BAD_ROLE',
      'Invite role must be ADMIN, SUB_ADMIN, or VIEWER.',
      400,
    );
  }
  return role;
}

export function generateTempPassword(): string {
  // Readable temp password — must change on first login.
  return `Tmp-${randomBytes(9).toString('base64url')}`;
}

export function hoursAgo(from: Date | null, now = new Date()): number | null {
  if (!from) return null;
  return Math.max(0, (now.getTime() - from.getTime()) / 3_600_000);
}

export function formatWhen(hours: number | null): string {
  if (hours == null) return 'Never';
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins} min ago`;
  }
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function mapStaffStatus(admin: {
  isActive: boolean;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
}): 'ACTIVE' | 'DISABLED' | 'INVITED' {
  if (!admin.isActive) return 'DISABLED';
  if (!admin.lastLoginAt && admin.mustChangePassword) return 'INVITED';
  return 'ACTIVE';
}

export function mapModulesForUi(modules: AdminModule[]): string[] {
  return modules.map((m) =>
    m === AdminModule.daily_challenge ? 'challenge' : m,
  );
}
// --- End: Staff admin live wire (Sachin) ---
