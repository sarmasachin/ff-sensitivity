import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertClaimLimit,
  assertRedeemDefId,
  assertSortOrder,
  assertWindowHours,
  sanitizeRedeemText,
} from './redeem-admin.security';
import type {
  CreateRedeemCadenceDto,
  CreateRedeemTypeDto,
  UpdateRedeemCadenceDto,
  UpdateRedeemTypeDto,
} from './dto/redeem-admin.dto';

@Injectable()
export class RedeemAdminDefsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTypes() {
    const rows = await this.prisma.redeemTypeDef.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { types: rows };
  }

  async listCadences() {
    const rows = await this.prisma.redeemCadenceDef.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { cadences: rows };
  }

  async requireType(raw: string, opts?: { mustBeEnabled?: boolean }) {
    const id = assertRedeemDefId(raw);
    const row = await this.prisma.redeemTypeDef.findUnique({ where: { id } });
    if (!row) {
      throw new AppError('REDEEM_BAD_TYPE', 'Unknown redeem type.', 400);
    }
    if (opts?.mustBeEnabled !== false && !row.enabled) {
      throw new AppError('REDEEM_BAD_TYPE', 'Redeem type is disabled.', 400);
    }
    return id;
  }

  async requireCadence(raw: string, opts?: { mustBeEnabled?: boolean }) {
    const id = assertRedeemDefId(raw);
    const row = await this.prisma.redeemCadenceDef.findUnique({
      where: { id },
    });
    if (!row) {
      throw new AppError('REDEEM_BAD_CADENCE', 'Unknown cadence.', 400);
    }
    if (opts?.mustBeEnabled !== false && !row.enabled) {
      throw new AppError('REDEEM_BAD_CADENCE', 'Cadence is disabled.', 400);
    }
    return id;
  }

  async createType(adminId: string, dto: CreateRedeemTypeDto) {
    const id = assertRedeemDefId(dto.id);
    const label = sanitizeRedeemText(dto.label, 40);
    if (!label) {
      throw new AppError('REDEEM_BAD_LABEL', 'Label is required.', 400);
    }
    const existing = await this.prisma.redeemTypeDef.findUnique({
      where: { id },
    });
    if (existing) {
      throw new AppError('REDEEM_TYPE_TAKEN', 'Type id already exists.', 409);
    }
    const row = await this.prisma.redeemTypeDef.create({
      data: {
        id,
        label,
        sortOrder: assertSortOrder(dto.sortOrder, 0),
        enabled: dto.enabled ?? true,
      },
    });
    await this.audit(adminId, 'redeem.type.create', id, { label: row.label });
    return row;
  }

  async updateType(adminId: string, idRaw: string, dto: UpdateRedeemTypeDto) {
    const id = assertRedeemDefId(idRaw);
    const existing = await this.prisma.redeemTypeDef.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError('REDEEM_TYPE_NOT_FOUND', 'Type not found.', 404);
    }
    const data: Prisma.RedeemTypeDefUpdateInput = {};
    if (dto.label != null) data.label = sanitizeRedeemText(dto.label, 40);
    if (dto.sortOrder != null) data.sortOrder = assertSortOrder(dto.sortOrder);
    if (dto.enabled != null) data.enabled = dto.enabled;
    const row = await this.prisma.redeemTypeDef.update({ where: { id }, data });
    await this.audit(adminId, 'redeem.type.update', id, { label: row.label });
    return row;
  }

  async removeType(adminId: string, idRaw: string) {
    const id = assertRedeemDefId(idRaw);
    const existing = await this.prisma.redeemTypeDef.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError('REDEEM_TYPE_NOT_FOUND', 'Type not found.', 404);
    }
    const used = await this.prisma.redeemCode.count({ where: { type: id } });
    if (used > 0) {
      throw new AppError(
        'REDEEM_TYPE_IN_USE',
        `Type is used by ${used} code(s). Change those first.`,
        409,
      );
    }
    await this.prisma.redeemTypeDef.delete({ where: { id } });
    await this.audit(adminId, 'redeem.type.delete', id, {
      label: existing.label,
    });
    return { ok: true, id };
  }

  async createCadence(adminId: string, dto: CreateRedeemCadenceDto) {
    const id = assertRedeemDefId(dto.id);
    const label = sanitizeRedeemText(dto.label, 40);
    if (!label) {
      throw new AppError('REDEEM_BAD_LABEL', 'Label is required.', 400);
    }
    const existing = await this.prisma.redeemCadenceDef.findUnique({
      where: { id },
    });
    if (existing) {
      throw new AppError(
        'REDEEM_CADENCE_TAKEN',
        'Cadence id already exists.',
        409,
      );
    }
    const row = await this.prisma.redeemCadenceDef.create({
      data: {
        id,
        label,
        claimLimit: assertClaimLimit(dto.claimLimit, 3),
        windowHours: assertWindowHours(dto.windowHours, 24),
        sortOrder: assertSortOrder(dto.sortOrder, 0),
        enabled: dto.enabled ?? true,
      },
    });
    await this.audit(adminId, 'redeem.cadence.create', id, {
      label: row.label,
    });
    return row;
  }

  async updateCadence(
    adminId: string,
    idRaw: string,
    dto: UpdateRedeemCadenceDto,
  ) {
    const id = assertRedeemDefId(idRaw);
    const existing = await this.prisma.redeemCadenceDef.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError('REDEEM_CADENCE_NOT_FOUND', 'Cadence not found.', 404);
    }
    const data: Prisma.RedeemCadenceDefUpdateInput = {};
    if (dto.label != null) data.label = sanitizeRedeemText(dto.label, 40);
    if (dto.claimLimit != null) {
      data.claimLimit = assertClaimLimit(dto.claimLimit);
    }
    if (dto.windowHours != null) {
      data.windowHours = assertWindowHours(dto.windowHours);
    }
    if (dto.sortOrder != null) data.sortOrder = assertSortOrder(dto.sortOrder);
    if (dto.enabled != null) data.enabled = dto.enabled;
    const row = await this.prisma.redeemCadenceDef.update({
      where: { id },
      data,
    });
    await this.audit(adminId, 'redeem.cadence.update', id, {
      label: row.label,
    });
    return row;
  }

  async removeCadence(adminId: string, idRaw: string) {
    const id = assertRedeemDefId(idRaw);
    const existing = await this.prisma.redeemCadenceDef.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError('REDEEM_CADENCE_NOT_FOUND', 'Cadence not found.', 404);
    }
    const used = await this.prisma.redeemCode.count({ where: { cadence: id } });
    if (used > 0) {
      throw new AppError(
        'REDEEM_CADENCE_IN_USE',
        `Cadence is used by ${used} code(s). Change those first.`,
        409,
      );
    }
    await this.prisma.redeemCadenceDef.delete({ where: { id } });
    await this.audit(adminId, 'redeem.cadence.delete', id, {
      label: existing.label,
    });
    return { ok: true, id };
  }

  private async audit(
    adminId: string,
    action: string,
    id: string,
    after: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: adminId,
        action,
        entity: `redeem_def:${id}`,
        afterJson: after as Prisma.InputJsonValue,
      },
    });
  }
}
