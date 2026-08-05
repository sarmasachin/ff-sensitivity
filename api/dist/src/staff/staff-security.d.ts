import { AdminModule, AdminRole } from '@prisma/client';
export declare const ASSIGNABLE_MODULES: AdminModule[];
export declare const INVITE_ROLES: AdminRole[];
export declare function sanitizeStaffText(raw: string, max: number): string;
export declare function assertSafeStaffText(text: string, field: string): void;
export declare function assertStaffId(raw: string): string;
export declare function assertStaffEmail(raw: string): string;
export declare function normalizeModules(raw: unknown): AdminModule[];
export declare function assertInviteRole(raw: string): AdminRole;
export declare function generateTempPassword(): string;
export declare function hoursAgo(from: Date | null, now?: Date): number | null;
export declare function formatWhen(hours: number | null): string;
export declare function formatDay(d: Date): string;
export declare function mapStaffStatus(admin: {
    isActive: boolean;
    lastLoginAt: Date | null;
    mustChangePassword: boolean;
}): 'ACTIVE' | 'DISABLED' | 'INVITED';
export declare function mapModulesForUi(modules: AdminModule[]): string[];
