import { Injectable } from '@nestjs/common';
import { AdminModule, AdminRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { SettingsService } from '../settings/settings.service';
import type { StaffInviteDto, StaffModulesDto } from './dto/staff.dto';
import {
  assertInviteRole,
  assertSafeStaffText,
  assertStaffEmail,
  assertStaffId,
  formatDay,
  formatWhen,
  generateTempPassword,
  hoursAgo,
  mapModulesForUi,
  mapStaffStatus,
  normalizeModules,
  sanitizeStaffText,
} from './staff-security';

// --- Start: Staff admin live wire (Sachin) ---
const BCRYPT_ROUNDS = 12;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private assertCanMutate(actor: AuthAdmin) {
    if (actor.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change staff.',
        403,
      );
    }
  }

  private assertCanManageTarget(
    actor: AuthAdmin,
    target: { id: string; role: AdminRole },
  ) {
    if (target.role === AdminRole.SUPER_ADMIN) {
      throw new AppError(
        'STAFF_PROTECTED',
        'Super Admin accounts cannot be changed here.',
        403,
      );
    }
    if (target.id === actor.id) {
      throw new AppError(
        'STAFF_SELF',
        'You cannot change your own staff account here.',
        403,
      );
    }
    // Only SUPER_ADMIN may touch ADMIN seats.
    if (
      target.role === AdminRole.ADMIN &&
      actor.role !== AdminRole.SUPER_ADMIN
    ) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Only Super Admin can manage Admin seats.',
        403,
      );
    }
  }

  private toRow(
    admin: {
      id: string;
      email: string;
      displayName: string | null;
      role: AdminRole;
      allowedModules: AdminModule[];
      isActive: boolean;
      mustChangePassword: boolean;
      lastLoginAt: Date | null;
      createdAt: Date;
    },
    now = new Date(),
  ) {
    const status = mapStaffStatus(admin);
    const h = hoursAgo(admin.lastLoginAt, now);
    let note = '';
    if (status === 'DISABLED') note = 'Account disabled.';
    else if (status === 'INVITED') note = 'Awaiting first login.';
    return {
      id: admin.id,
      name: admin.displayName?.trim() || admin.email.split('@')[0] || 'Staff',
      email: admin.email,
      role: admin.role,
      status,
      modules: mapModulesForUi(admin.allowedModules),
      lastLoginLabel: formatWhen(h),
      invitedAtLabel: formatDay(admin.createdAt),
      note,
    };
  }

  private async loadRow(id: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) {
      throw new AppError('STAFF_NOT_FOUND', 'Staff member not found.', 404);
    }
    return this.toRow(admin);
  }

  async adminList() {
    const rows = await this.prisma.admin.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
    const now = new Date();
    return { staff: rows.map((r) => this.toRow(r, now)) };
  }

  async invite(actor: AuthAdmin, dto: StaffInviteDto) {
    this.assertCanMutate(actor);
    await this.settings.assertStepUp(actor.id, dto.currentPassword, 'staff');
    const name = sanitizeStaffText(dto.name, 80);
    const email = assertStaffEmail(dto.email);
    const role = assertInviteRole(dto.role);
    assertSafeStaffText(name, 'Name');
    if (!name) {
      throw new AppError('STAFF_BAD_NAME', 'Name is required.', 400);
    }

    if (role === AdminRole.ADMIN && actor.role !== AdminRole.SUPER_ADMIN) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Only Super Admin can invite Admin seats.',
        403,
      );
    }

    let modules = normalizeModules(dto.modules);
    // Non–super actors cannot grant the staff module.
    if (
      actor.role !== AdminRole.SUPER_ADMIN &&
      modules.includes(AdminModule.staff)
    ) {
      modules = modules.filter((m) => m !== AdminModule.staff);
      if (modules.length === 0) {
        throw new AppError(
          'STAFF_BAD_MODULES',
          'Assign at least one non-staff module.',
          400,
        );
      }
    }

    const existing = await this.prisma.admin.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(
        'STAFF_EXISTS',
        'An account with this email already exists.',
        409,
      );
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const admin = await tx.admin.create({
          data: {
            email,
            passwordHash,
            role,
            allowedModules: modules,
            displayName: name,
            isActive: true,
            mustChangePassword: true,
          },
        });
        await tx.auditLog.create({
          data: {
            actorAdminId: actor.id,
            action: 'staff:invite',
            entity: `admin:${admin.id}`,
            afterJson: { email, role, modules },
          },
        });
        return admin;
      });

      return {
        staff: this.toRow(created),
        temporaryPassword: tempPassword,
      };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new AppError(
          'STAFF_EXISTS',
          'An account with this email already exists.',
          409,
        );
      }
      throw e;
    }
  }

  async setModules(actor: AuthAdmin, idRaw: string, dto: StaffModulesDto) {
    this.assertCanMutate(actor);
    const id = assertStaffId(idRaw);
    const target = await this.prisma.admin.findUnique({ where: { id } });
    if (!target) {
      throw new AppError('STAFF_NOT_FOUND', 'Staff member not found.', 404);
    }
    this.assertCanManageTarget(actor, target);

    const requested = normalizeModules(dto.modules);
    const wantsStaff = requested.includes(AdminModule.staff);
    const hadStaff = target.allowedModules.includes(AdminModule.staff);
    let modules: AdminModule[];

    if (actor.role !== AdminRole.SUPER_ADMIN) {
      // Non-super cannot grant staff; also cannot silently drop an existing grant.
      if (wantsStaff && !hadStaff) {
        throw new AppError(
          'FORBIDDEN_ROLE',
          'Only Super Admin can grant the staff module.',
          403,
        );
      }
      modules = requested.filter((m) => m !== AdminModule.staff);
      if (hadStaff) modules.push(AdminModule.staff);
      if (modules.length === 0) {
        throw new AppError(
          'STAFF_BAD_MODULES',
          'Assign at least one module.',
          400,
        );
      }
    } else {
      modules = requested;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.admin.update({
        where: { id },
        data: { allowedModules: modules },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: actor.id,
          action: 'staff:modules',
          entity: `admin:${id}`,
          beforeJson: { modules: target.allowedModules },
          afterJson: { modules },
        },
      });
    });

    return { staff: await this.loadRow(id) };
  }

  async disable(actor: AuthAdmin, idRaw: string) {
    this.assertCanMutate(actor);
    const id = assertStaffId(idRaw);
    const target = await this.prisma.admin.findUnique({ where: { id } });
    if (!target) {
      throw new AppError('STAFF_NOT_FOUND', 'Staff member not found.', 404);
    }
    this.assertCanManageTarget(actor, target);

    await this.prisma.$transaction(async (tx) => {
      await tx.admin.update({
        where: { id },
        data: { isActive: false },
      });
      await tx.adminSession.updateMany({
        where: { adminId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: actor.id,
          action: 'staff:disable',
          entity: `admin:${id}`,
          beforeJson: { isActive: true },
          afterJson: { isActive: false, sessionsRevoked: true },
        },
      });
    });

    return { staff: await this.loadRow(id) };
  }

  async enable(actor: AuthAdmin, idRaw: string) {
    this.assertCanMutate(actor);
    const id = assertStaffId(idRaw);
    const target = await this.prisma.admin.findUnique({ where: { id } });
    if (!target) {
      throw new AppError('STAFF_NOT_FOUND', 'Staff member not found.', 404);
    }
    this.assertCanManageTarget(actor, target);

    await this.prisma.$transaction(async (tx) => {
      await tx.admin.update({
        where: { id },
        data: { isActive: true },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: actor.id,
          action: 'staff:enable',
          entity: `admin:${id}`,
          beforeJson: { isActive: false },
          afterJson: { isActive: true },
        },
      });
    });

    return { staff: await this.loadRow(id) };
  }

  async resendInvite(actor: AuthAdmin, idRaw: string) {
    this.assertCanMutate(actor);
    const id = assertStaffId(idRaw);
    const target = await this.prisma.admin.findUnique({ where: { id } });
    if (!target) {
      throw new AppError('STAFF_NOT_FOUND', 'Staff member not found.', 404);
    }
    this.assertCanManageTarget(actor, target);
    if (!target.isActive || target.lastLoginAt || !target.mustChangePassword) {
      throw new AppError(
        'STAFF_NOT_INVITED',
        'Only pending invites can be resent.',
        409,
      );
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction(async (tx) => {
      await tx.admin.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true },
      });
      await tx.adminSession.updateMany({
        where: { adminId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: actor.id,
          action: 'staff:resend_invite',
          entity: `admin:${id}`,
          afterJson: { email: target.email },
        },
      });
    });

    return {
      staff: await this.loadRow(id),
      temporaryPassword: tempPassword,
    };
  }
}
// --- End: Staff admin live wire (Sachin) ---
