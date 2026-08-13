import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RedeemCodeStatus,
  RedeemMode,
  RedeemSecretStatus,
} from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { maskRedeemCode } from './redeem-mask';
import { RedeemAdminPoolService } from './redeem-admin-pool.service';
import { RedeemAdminDefsService } from './redeem-admin-defs.service';
import {
  assertCodeSecret,
  assertRedeemAdminId,
  assertRedeemStatus,
  assertStockLeft,
  sanitizeRedeemText,
} from './redeem-admin.security';
import type {
  AppendRedeemPoolDto,
  CreateRedeemCodeDto,
  UpdateRedeemCodeDto,
} from './dto/redeem-admin.dto';

@Injectable()
export class RedeemAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly pool: RedeemAdminPoolService,
    private readonly defs: RedeemAdminDefsService,
  ) {}

  async list() {
    const [rows, types, cadences] = await Promise.all([
      this.prisma.redeemCode.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              secrets: { where: { status: RedeemSecretStatus.UNUSED } },
            },
          },
        },
      }),
      this.prisma.redeemTypeDef.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.redeemCadenceDef.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
    ]);
    return {
      codes: rows.map((row) => this.toListRow(row, row._count.secrets)),
      types,
      cadences,
    };
  }

  async create(adminId: string, dto: CreateRedeemCodeDto) {
    const mode = dto.mode ?? RedeemMode.SINGLE;
    if (mode === RedeemMode.SCRATCH_REWARD) {
      try {
        const { row, poolSize } = await this.pool.createScratchReward(
          adminId,
          dto,
        );
        return this.toListRow(row, poolSize);
      } catch (err) {
        this.rethrowUnique(err);
        throw err;
      }
    }
    const data = (await this.parseWrite(
      dto,
      true,
    )) as Prisma.RedeemCodeCreateInput;
    data.mode = RedeemMode.SINGLE;
    try {
      const row = await this.prisma.redeemCode.create({ data });
      await this.audit(adminId, 'redeem.create', row.id, {
        title: row.title,
        status: row.status,
        mode: row.mode,
      });
      return this.toListRow(row, null);
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
    const data = (await this.parseWrite(
      dto,
      false,
    )) as Prisma.RedeemCodeUpdateInput;
    if (existing.mode === RedeemMode.SCRATCH_REWARD) {
      if (dto.coinRewardMin != null) data.coinRewardMin = dto.coinRewardMin;
      if (dto.coinRewardMax != null) data.coinRewardMax = dto.coinRewardMax;
      if (dto.windowMinutes != null) {
        data.windowMinutes = Math.max(5, Math.min(240, dto.windowMinutes));
      }
      if (dto.codesPerWindow != null) {
        data.codesPerWindow = Math.max(1, Math.min(20, dto.codesPerWindow));
      }
      if (dto.startsAt !== undefined) {
        data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
      }
      if (dto.endsAt !== undefined) {
        data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
      }
      if (dto.codePool?.length) {
        await this.pool.appendSecrets(codeId, dto.codePool);
      }
    }
    try {
      const row = await this.prisma.redeemCode.update({
        where: { id: codeId },
        data,
      });
      const poolLeft =
        row.mode === RedeemMode.SCRATCH_REWARD
          ? await this.pool.unusedPoolCount(codeId)
          : null;
      if (poolLeft != null && row.stockLeft !== poolLeft) {
        await this.prisma.redeemCode.update({
          where: { id: codeId },
          data: { stockLeft: poolLeft },
        });
        row.stockLeft = poolLeft;
      }
      await this.audit(adminId, 'redeem.update', row.id, {
        title: row.title,
        status: row.status,
        mode: row.mode,
      });
      return this.toListRow(row, poolLeft);
    } catch (err) {
      this.rethrowUnique(err);
      throw err;
    }
  }

  async appendPool(adminId: string, id: string, dto: AppendRedeemPoolDto) {
    const codeId = assertRedeemAdminId(id);
    const existing = await this.prisma.redeemCode.findUnique({
      where: { id: codeId },
    });
    if (!existing) {
      throw new AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
    }
    if (existing.mode !== RedeemMode.SCRATCH_REWARD) {
      throw new AppError(
        'REDEEM_WRONG_MODE',
        'Only scratch-reward cards accept a code pool.',
        409,
      );
    }
    const added = await this.pool.appendSecrets(codeId, dto.codePool ?? []);
    const poolLeft = await this.pool.unusedPoolCount(codeId);
    await this.prisma.redeemCode.update({
      where: { id: codeId },
      data: { stockLeft: poolLeft },
    });
    await this.audit(adminId, 'redeem.pool_append', codeId, {
      added,
      poolLeft,
    });
    const row = await this.prisma.redeemCode.findUniqueOrThrow({
      where: { id: codeId },
    });
    return { ...this.toListRow(row, poolLeft), added };
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
      include: {
        secrets: {
          where: { status: RedeemSecretStatus.UNUSED },
          orderBy: { createdAt: 'asc' },
          take: 5,
        },
      },
    });
    if (!row) {
      throw new AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
    }
    await this.audit(adminId, 'redeem.reveal', row.id, { title: row.title });
    if (row.mode === RedeemMode.SCRATCH_REWARD) {
      return {
        id: row.id,
        title: row.title,
        mode: row.mode,
        codeMasked: 'POOL',
        code: null as string | null,
        unusedPreview: row.secrets.map((s) => ({
          id: s.id,
          codeMasked: maskRedeemCode(s.codeSecret),
          code: s.codeSecret,
        })),
      };
    }
    return {
      id: row.id,
      title: row.title,
      mode: row.mode,
      codeMasked: maskRedeemCode(row.codeSecret),
      code: row.codeSecret,
      unusedPreview: [] as { id: string; codeMasked: string; code: string }[],
    };
  }

  private async parseWrite(
    dto: CreateRedeemCodeDto | UpdateRedeemCodeDto,
    create: boolean,
  ) {
    const title = dto.title != null ? sanitizeRedeemText(dto.title, 80) : '';
    if (create && !title) {
      throw new AppError('REDEEM_BAD_TITLE', 'Title is required.', 400);
    }
    const valueLabel =
      dto.valueLabel != null ? sanitizeRedeemText(dto.valueLabel, 40) : '';
    if (create && !valueLabel) {
      throw new AppError('REDEEM_BAD_VALUE', 'Value is required.', 400);
    }
    const data:
      | Prisma.RedeemCodeUncheckedCreateInput
      | Prisma.RedeemCodeUpdateInput = {};
    if (dto.title != null) data.title = title;
    if (dto.type != null) data.type = await this.defs.requireType(dto.type);
    if (dto.valueLabel != null) data.valueLabel = valueLabel;
    if (dto.codeSecret != null && dto.codeSecret.trim()) {
      data.codeSecret = assertCodeSecret(dto.codeSecret);
    } else if (create) {
      throw new AppError('REDEEM_BAD_SECRET', 'Code is required.', 400);
    }
    if (dto.status != null) data.status = assertRedeemStatus(dto.status);
    if (dto.cadence != null) {
      data.cadence = await this.defs.requireCadence(dto.cadence);
    }
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

  private toListRow(
    row: {
      id: string;
      title: string;
      type: string;
      valueLabel: string;
      codeSecret: string;
      status: string;
      cadence: string;
      mode?: string;
      stockLeft: number;
      coinCost: number | null;
      coinRewardMin?: number | null;
      coinRewardMax?: number | null;
      startsAt?: Date | null;
      endsAt?: Date | null;
      windowMinutes?: number;
      codesPerWindow?: number;
      expiresLabel: string;
      tip: string;
      redeemUrl: string;
    },
    poolLeft: number | null,
  ) {
    const mode = row.mode ?? RedeemMode.SINGLE;
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      valueLabel: row.valueLabel,
      codeSecret: '',
      codeMasked:
        mode === RedeemMode.SCRATCH_REWARD
          ? 'POOL'
          : maskRedeemCode(row.codeSecret),
      status: row.status,
      cadence: row.cadence,
      mode,
      stockLeft: poolLeft ?? row.stockLeft,
      poolLeft,
      coinCost: row.coinCost,
      coinRewardMin: row.coinRewardMin ?? null,
      coinRewardMax: row.coinRewardMax ?? null,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      windowMinutes: row.windowMinutes ?? 30,
      codesPerWindow: row.codesPerWindow ?? 1,
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
