import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RedeemMode,
  RedeemSecretStatus,
} from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { RedeemScratchService } from './redeem-scratch.service';
import { RedeemAdminDefsService } from './redeem-admin-defs.service';
import {
  assertCodeSecret,
  assertRedeemStatus,
  sanitizeRedeemText,
} from './redeem-admin.security';
import type { CreateRedeemCodeDto } from './dto/redeem-admin.dto';

@Injectable()
export class RedeemAdminPoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defs: RedeemAdminDefsService,
  ) {}

  async createScratchReward(adminId: string, dto: CreateRedeemCodeDto) {
    const title = sanitizeRedeemText(dto.title, 80);
    if (!title) {
      throw new AppError('REDEEM_BAD_TITLE', 'Title is required.', 400);
    }
    const valueLabel = sanitizeRedeemText(dto.valueLabel, 40);
    if (!valueLabel) {
      throw new AppError('REDEEM_BAD_VALUE', 'Value is required.', 400);
    }
    const pool = this.normalizePool(dto.codePool);
    if (!pool.length) {
      throw new AppError(
        'REDEEM_BAD_POOL',
        'Paste at least one unique code for the pool.',
        400,
      );
    }
    const min = dto.coinRewardMin ?? 5;
    const max = dto.coinRewardMax ?? 20;
    if (max < min) {
      throw new AppError(
        'REDEEM_BAD_COIN_RANGE',
        'Max coins must be greater than or equal to min coins.',
        400,
      );
    }
    const tip =
      sanitizeRedeemText(dto.tip ?? '', 120) || RedeemScratchService.SAFE_TIP;
    const sentinel = `POOL:${Date.now().toString(36)}:${Math.random()
      .toString(36)
      .slice(2, 10)}`.toUpperCase();
    const type = await this.defs.requireType(dto.type);
    const cadence = await this.defs.requireCadence(dto.cadence);

    const row = await this.prisma.$transaction(async (tx) => {
      return tx.redeemCode.create({
        data: {
          title,
          type,
          valueLabel,
          codeSecret: sentinel,
          status: assertRedeemStatus(dto.status),
          cadence,
          mode: RedeemMode.SCRATCH_REWARD,
          stockLeft: pool.length,
          coinCost: null,
          coinRewardMin: min,
          coinRewardMax: max,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          windowMinutes: Math.max(5, Math.min(240, dto.windowMinutes ?? 30)),
          codesPerWindow: Math.max(1, Math.min(20, dto.codesPerWindow ?? 1)),
          expiresLabel:
            sanitizeRedeemText(dto.expiresLabel ?? '', 40) || 'Schedule',
          tip,
          redeemUrl:
            sanitizeRedeemText(dto.redeemUrl ?? '', 200) ||
            'https://play.google.com/redeem',
          secrets: {
            create: pool.map((codeSecret) => ({ codeSecret })),
          },
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        actorAdminId: adminId,
        action: 'redeem.create',
        entity: `redeem_code:${row.id}`,
        afterJson: {
          title: row.title,
          status: row.status,
          mode: row.mode,
          poolSize: pool.length,
        } as Prisma.InputJsonValue,
      },
    });
    return { row, poolSize: pool.length };
  }

  async appendSecrets(redeemCodeId: string, raw: string[]) {
    const pool = this.normalizePool(raw);
    if (!pool.length) {
      throw new AppError(
        'REDEEM_BAD_POOL',
        'Paste at least one unique code to append.',
        400,
      );
    }
    let added = 0;
    for (const codeSecret of pool) {
      try {
        await this.prisma.redeemCodeSecret.create({
          data: { redeemCodeId, codeSecret },
        });
        added += 1;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }
    if (added === 0) {
      throw new AppError(
        'REDEEM_SECRET_TAKEN',
        'Those codes are already in inventory.',
        409,
      );
    }
    return added;
  }

  async unusedPoolCount(redeemCodeId: string) {
    return this.prisma.redeemCodeSecret.count({
      where: { redeemCodeId, status: RedeemSecretStatus.UNUSED },
    });
  }

  normalizePool(raw?: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const line of raw ?? []) {
      try {
        const secret = assertCodeSecret(String(line));
        if (seen.has(secret)) continue;
        seen.add(secret);
        out.push(secret);
      } catch {
        // skip invalid lines
      }
    }
    return out;
  }
}
