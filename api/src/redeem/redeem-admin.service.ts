import { Injectable } from '@nestjs/common';
import { Prisma, RedeemCodeStatus } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { maskRedeemCode } from './redeem-mask';
import {
  assertCodeSecret,
  assertRedeemAdminId,
  assertRedeemCadence,
  assertRedeemStatus,
  assertRedeemType,
  assertStockLeft,
  sanitizeRedeemText,
} from './redeem-admin.security';
import type {
  CreateRedeemCodeDto,
  UpdateRedeemCodeDto,
} from './dto/redeem-admin.dto';

@Injectable()
export class RedeemAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async list() {
    const rows = await this.prisma.redeemCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { codes: rows.map((row) => this.toListRow(row)) };
  }

  async create(adminId: string, dto: CreateRedeemCodeDto) {
    const data = this.parseWrite(dto, true) as Prisma.RedeemCodeCreateInput;
    try {
      const row = await this.prisma.redeemCode.create({ data });
      await this.audit(adminId, 'redeem.create', row.id, {
        title: row.title,
        status: row.status,
      });
      return this.toListRow(row);
    } catch (err) {
      this.rethrowUnique(err);
      throw err;
    }
  }

  async update(adminId: string, id: string, dto: UpdateRedeemCodeDto) {
    const codeId = assertRedeemAdminId(id);
    const existing = await this.prisma.redeemCode.findUnique({
      where: { id: codeId },
    });
    if (!existing) {
      throw new AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
    }
    const data = this.parseWrite(dto, false) as Prisma.RedeemCodeUpdateInput;
    try {
      const row = await this.prisma.redeemCode.update({
        where: { id: codeId },
        data,
      });
      await this.audit(adminId, 'redeem.update', row.id, {
        title: row.title,
        status: row.status,
      });
      return this.toListRow(row);
    } catch (err) {
      this.rethrowUnique(err);
      throw err;
    }
  }

  async remove(adminId: string, id: string) {
    const codeId = assertRedeemAdminId(id);
    const existing = await this.prisma.redeemCode.findUnique({
      where: { id: codeId },
      select: { id: true, title: true },
    });
    if (!existing) {
      throw new AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
    }
    await this.prisma.redeemCode.delete({ where: { id: codeId } });
    await this.audit(adminId, 'redeem.delete', codeId, {
      title: existing.title,
    });
    return { ok: true, id: codeId };
  }

  async reveal(adminId: string, id: string, currentPassword?: string) {
    const codeId = assertRedeemAdminId(id);
    await this.settings.assertStepUp(adminId, currentPassword, 'reveal');
    const row = await this.prisma.redeemCode.findUnique({
      where: { id: codeId },
    });
    if (!row) {
      throw new AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
    }
    await this.audit(adminId, 'redeem.reveal', row.id, { title: row.title });
    return {
      id: row.id,
      title: row.title,
      codeMasked: maskRedeemCode(row.codeSecret),
      code: row.codeSecret,
    };
  }

  private parseWrite(dto: CreateRedeemCodeDto | UpdateRedeemCodeDto, create: boolean) {
    const title = dto.title != null ? sanitizeRedeemText(dto.title, 80) : '';
    if (create && !title) {
      throw new AppError('REDEEM_BAD_TITLE', 'Title is required.', 400);
    }
    const valueLabel =
      dto.valueLabel != null ? sanitizeRedeemText(dto.valueLabel, 40) : '';
    if (create && !valueLabel) {
      throw new AppError('REDEEM_BAD_VALUE', 'Value is required.', 400);
    }
    const data: Prisma.RedeemCodeUncheckedCreateInput | Prisma.RedeemCodeUpdateInput =
      {};
    if (dto.title != null) data.title = title;
    if (dto.type != null) data.type = assertRedeemType(dto.type);
    if (dto.valueLabel != null) data.valueLabel = valueLabel;
    if (dto.codeSecret != null && dto.codeSecret.trim()) {
      data.codeSecret = assertCodeSecret(dto.codeSecret);
    } else if (create) {
      throw new AppError('REDEEM_BAD_SECRET', 'Code is required.', 400);
    }
    if (dto.status != null) data.status = assertRedeemStatus(dto.status);
    if (dto.cadence != null) data.cadence = assertRedeemCadence(dto.cadence);
    if (dto.stockLeft != null) data.stockLeft = assertStockLeft(dto.stockLeft);
    if (create && dto.stockLeft == null) data.stockLeft = 1;
    if (dto.coinCost !== undefined) {
      data.coinCost =
        dto.coinCost == null ? null : Math.max(0, Math.floor(dto.coinCost));
    }
    if (dto.expiresLabel != null) {
      data.expiresLabel =
        sanitizeRedeemText(dto.expiresLabel, 40) || 'No expiry';
    } else if (create) {
      data.expiresLabel = 'No expiry';
    }
    if (dto.tip != null) {
      data.tip = sanitizeRedeemText(dto.tip, 120) || 'First Come, First Serve!';
    }
    if (dto.redeemUrl != null) {
      data.redeemUrl =
        sanitizeRedeemText(dto.redeemUrl, 200) ||
        'https://play.google.com/redeem';
    } else if (create) {
      data.redeemUrl = 'https://play.google.com/redeem';
    }
    if (create && !data.status) data.status = RedeemCodeStatus.ACTIVE;
    return data;
  }

  private toListRow(row: {
    id: string;
    title: string;
    type: string;
    valueLabel: string;
    codeSecret: string;
    status: string;
    cadence: string;
    stockLeft: number;
    coinCost: number | null;
    expiresLabel: string;
    tip: string;
    redeemUrl: string;
  }) {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      valueLabel: row.valueLabel,
      codeSecret: '',
      codeMasked: maskRedeemCode(row.codeSecret),
      status: row.status,
      cadence: row.cadence,
      stockLeft: row.stockLeft,
      coinCost: row.coinCost,
      expiresLabel: row.expiresLabel,
      tip: row.tip,
      redeemUrl: row.redeemUrl,
    };
  }

  private rethrowUnique(err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new AppError(
        'REDEEM_SECRET_TAKEN',
        'That code secret is already in inventory.',
        409,
      );
    }
  }

  private async audit(
    adminId: string,
    action: string,
    entityId: string,
    afterJson: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: adminId,
        action,
        entity: `redeem_code:${entityId}`,
        afterJson: afterJson as Prisma.InputJsonValue,
      },
    });
  }
}
