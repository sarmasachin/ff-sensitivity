"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countUserDeskStats = countUserDeskStats;
async function countUserDeskStats(prisma) {
    const [total, deleted, suspended, restricted, active, coins] = await Promise.all([
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
//# sourceMappingURL=users-stats.js.map