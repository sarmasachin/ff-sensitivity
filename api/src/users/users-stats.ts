import type { PrismaService } from '../prisma/prisma.service';

export type UserDeskStats = {
  total: number;
  active: number;
  restricted: number;
  suspended: number;
  deleted: number;
  coinsHeld: number;
};

/** Full-table counts. Same status order as mapAccountStatus. */
export async function countUserDeskStats(
  prisma: PrismaService,
): Promise<UserDeskStats> {
  const [total, deleted, suspended, restricted, active, coins] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { dataDeletedAt: { not: null } } }),
      prisma.user.count({
        where: { dataDeletedAt: null, isActive: false },
      }),
      prisma.user.count({
        where: { dataDeletedAt: null, isActive: true, isRestricted: true },
      }),
      prisma.user.count({
        where: { dataDeletedAt: null, isActive: true, isRestricted: false },
      }),
      prisma.user.aggregate({ _sum: { coins: true } }),
    ]);

  return {
    total,
    active,
    restricted,
    suspended,
    deleted,
    coinsHeld: coins._sum.coins ?? 0,
  };
}
