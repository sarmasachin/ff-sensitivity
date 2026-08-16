import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SavePromosDto } from './dto/promos.dto';
import {
  assertPromos,
  compactPromoOrders,
  promoWriteData,
  toPromoRow,
} from './promos-shared';

@Injectable()
export class PromosService {
  constructor(private readonly prisma: PrismaService) {}

  async adminList() {
    const rows = await this.prisma.promo.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    return { promos: rows.map((r) => toPromoRow(r)) };
  }

  async adminSave(adminId: string, dto: SavePromosDto) {
    assertPromos(dto.promos);
    const normalized = dto.promos
      .map((row) => promoWriteData(row))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      .map((row, i) => ({ ...row, sortOrder: i + 1 }));

    await this.prisma.$transaction(async (tx) => {
      await tx.promo.deleteMany({});
      if (normalized.length > 0) {
        await tx.promo.createMany({ data: normalized });
      }
      await compactPromoOrders(tx);
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: 'promos.save',
          entity: 'promos:catalog',
          afterJson: { count: normalized.length } as Prisma.InputJsonValue,
        },
      });
    });

    return this.adminList();
  }

  /** Public live set — enabled + inside schedule window (server time). */
  async liveCatalog() {
    const now = new Date();
    const rows = await this.prisma.promo.findMany({
      where: {
        enabled: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      take: 40,
    });
    return {
      promos: rows.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        imageLabel: r.imageLabel,
        deepLink: r.deepLink,
        placement: r.placement,
        sortOrder: r.sortOrder,
      })),
    };
  }
}
