import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { PromoDto } from './dto/promos.dto';
import {
  MAX_PROMOS,
  auditPromos,
  compactPromoOrders,
  promoWriteData,
  rethrowUnique,
  sanitizePromoId,
  toPromoRow,
} from './promos-shared';

@Injectable()
export class PromosAdminItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(adminId: string, dto: PromoDto) {
    const count = await this.prisma.promo.count();
    if (count >= MAX_PROMOS) {
      throw new AppError('PROMOS_LIMIT', 'Promo table is full (max 40).', 400);
    }
    const data = promoWriteData(dto);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.promo.create({ data });
        await compactPromoOrders(tx);
        return tx.promo.findUniqueOrThrow({ where: { id: created.id } });
      });
      await auditPromos(this.prisma, adminId, 'promos.create', `promo:${row.id}`, {
        id: row.id,
      });
      return toPromoRow(row);
    } catch (e) {
      rethrowUnique(e, 'PROMOS_DUP_ID', `Promo id already exists: ${data.id}`);
    }
  }

  async update(adminId: string, rawId: string, dto: PromoDto) {
    const id = sanitizePromoId(rawId);
    const existing = await this.prisma.promo.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('PROMOS_NOT_FOUND', 'Promo not found.', 404);
    }
    const data = promoWriteData({ ...dto, id });
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.promo.update({
        where: { id },
        data: {
          title: data.title,
          subtitle: data.subtitle,
          imageLabel: data.imageLabel,
          deepLink: data.deepLink,
          placement: data.placement,
          sortOrder: data.sortOrder,
          enabled: data.enabled,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
        },
      });
      await compactPromoOrders(tx);
      return tx.promo.findUniqueOrThrow({ where: { id } });
    });
    await auditPromos(this.prisma, adminId, 'promos.update', `promo:${id}`, {
      id,
    });
    return toPromoRow(row);
  }

  async remove(adminId: string, rawId: string) {
    const id = sanitizePromoId(rawId);
    const deleted = await this.prisma.$transaction(async (tx) => {
      const result = await tx.promo.deleteMany({ where: { id } });
      if (result.count === 0) {
        throw new AppError('PROMOS_NOT_FOUND', 'Promo not found.', 404);
      }
      await compactPromoOrders(tx);
      return result;
    });
    await auditPromos(this.prisma, adminId, 'promos.delete', `promo:${id}`, {
      id,
    });
    return { ok: true as const, id, deleted: deleted.count };
  }

  async reorder(adminId: string, ids: string[]) {
    const unique = [...new Set(ids.map((id) => sanitizePromoId(id)))];
    const existing = await this.prisma.promo.findMany({ select: { id: true } });
    const existingIds = new Set(existing.map((r) => r.id));
    if (
      unique.length !== existing.length ||
      unique.some((id) => !existingIds.has(id))
    ) {
      throw new AppError(
        'PROMOS_REORDER_MISMATCH',
        'Reorder list must include every promo id exactly once.',
        400,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < unique.length; i++) {
        await tx.promo.update({
          where: { id: unique[i] },
          data: { sortOrder: i + 1 },
        });
      }
    });
    await auditPromos(this.prisma, adminId, 'promos.reorder', 'promos:catalog', {
      count: unique.length,
    });
    const rows = await this.prisma.promo.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    return { promos: rows.map((r) => toPromoRow(r)) };
  }
}
