"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETED_USER_PURGE_BATCH = exports.DELETED_USER_PURGE_INTERVAL_MS = exports.DELETED_USER_RETENTION_DAYS = void 0;
exports.purgeDeletedUsers = purgeDeletedUsers;
exports.DELETED_USER_RETENTION_DAYS = 90;
exports.DELETED_USER_PURGE_INTERVAL_MS = 60 * 60 * 1000;
exports.DELETED_USER_PURGE_BATCH = 100;
async function purgeDeletedUsers(prisma) {
    const cutoff = new Date(Date.now() - exports.DELETED_USER_RETENTION_DAYS * 86_400_000);
    const stale = await prisma.user.findMany({
        where: { dataDeletedAt: { not: null, lte: cutoff } },
        orderBy: { dataDeletedAt: 'asc' },
        take: exports.DELETED_USER_PURGE_BATCH,
        select: {
            id: true,
            googleSub: true,
            email: true,
            googleBanned: true,
            dataDeletedAt: true,
        },
    });
    let purged = 0;
    for (const user of stale) {
        await prisma.$transaction(async (tx) => {
            await hardDeleteDeletedUser(tx, user);
        });
        purged += 1;
    }
    return { purged, cutoff: cutoff.toISOString() };
}
async function hardDeleteDeletedUser(tx, user) {
    if (user.googleBanned) {
        await tx.bannedGoogleAccount.upsert({
            where: { googleSub: user.googleSub },
            create: {
                googleSub: user.googleSub,
                email: user.email,
                bannedAt: user.dataDeletedAt ?? new Date(),
            },
            update: { email: user.email },
        });
    }
    await tx.appAnalyticsEvent.deleteMany({ where: { userId: user.id } });
    await tx.redeemCodeSecret.updateMany({
        where: { assignedUserId: user.id },
        data: { assignedUserId: null, assignedAt: null },
    });
    await tx.user.delete({ where: { id: user.id } });
    await tx.auditLog.create({
        data: {
            actorAdminId: null,
            action: 'user:auto-purge',
            entity: `user:${user.id}`,
            afterJson: {
                googleBanned: user.googleBanned,
                dataDeletedAt: user.dataDeletedAt?.toISOString() ?? null,
                retentionDays: exports.DELETED_USER_RETENTION_DAYS,
            },
        },
    });
}
//# sourceMappingURL=users-purge.js.map