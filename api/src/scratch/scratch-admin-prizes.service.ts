import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import type { ScratchPrizeDto } from './dto/scratch.dto';
import {
  assertPrizes,
  auditScratch,
  mapPrize,
  prizeWriteData,
  rethrowUnique,
  sanitizeId,
} from './scratch-shared';

@Injectable()
export class ScratchAdminPrizesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(adminId: string, dto: ScratchPrizeDto) {
    assertPrizes([dto]);
    const count = await this.prisma.scratchPrize.count();
    if (count >= 200) {
      throw new AppError('SCRATCH_PRIZE_LIMIT', 'Too many prizes.', 400);
    }
    const first = await this.prisma.scratchPrize.findFirst({
      orderBy: { sortOrder: 'asc' },
      select: { sortOrder: true },
    });
    const data = prizeWriteData(dto, (first?.sortOrder ?? 0) - 1);
    try {
      const row = await this.prisma.scratchPrize.create({ data });
      await auditScratch(
        this.prisma,
        adminId,
        'scratch.prize.create',
        `scratch_prize:${row.id}`,
        { id: row.id, kind: row.kind },
      );
      return mapPrize(row);
    } catch (e) {
      rethrowUnique(e, 'SCRATCH_DUP_PRIZE', `Prize id already exists: ${data.id}`);
    }
  }

  async update(adminId: string, rawId: string, dto: ScratchPrizeDto) {
    assertPrizes([dto]);
    const id = sanitizeId(rawId, 'prize');
    const existing = await this.prisma.scratchPrize.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('SCRATCH_PRIZE_NOT_FOUND', 'Prize not found.', 404);
    }
    const row = await this.prisma.scratchPrize.update({
      where: { id },
      data: {
        title: dto.title.trim(),
        detail: dto.detail.trim(),
        kind: dto.kind,
        rewardLabel: dto.rewardLabel.trim(),
        coinReward: dto.coinReward,
        oddsPercent: dto.oddsPercent,
        enabled: dto.enabled,
        streakDays: dto.streakDays ?? null,
      },
    });
    await auditScratch(
      this.prisma,
      adminId,
      'scratch.prize.update',
      `scratch_prize:${id}`,
      { id },
    );
    return mapPrize(row);
  }

  async delete(adminId: string, rawId: string) {
    const id = sanitizeId(rawId, 'prize');
    const deleted = await this.prisma.scratchPrize.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      throw new AppError('SCRATCH_PRIZE_NOT_FOUND', 'Prize not found.', 404);
    }
    await auditScratch(
      this.prisma,
      adminId,
      'scratch.prize.delete',
      `scratch_prize:${id}`,
      { id },
    );
    return { ok: true as const, id };
  }
}
