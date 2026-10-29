import type { Prisma, PrismaClient } from '@prisma/client';

export const DELETED_USER_RETENTION_DAYS = 90;
export const DELETED_USER_PURGE_INTERVAL_MS = 60 * 60 * 1000;
export const DELETED_USER_PURGE_BATCH = 100;

type Db = PrismaClient | Prisma.TransactionClient;

/** Soft-deleted seats older than 90 days. Admin bans move to BannedGoogleAccount. */
export async function purgeDeletedUsers(prisma: PrismaClient): Promise<{
  purged: number;
  cutoff: string;
}> {
  const cutoff = new Date(
    Date.now() - DELETED_USER_RETENTION_DAYS * 86_400_000,
  );
  const stale = await prisma.user.findMany({
    where: { dataDeletedAt: { not: null, lte: cutoff } },
    orderBy: { dataDeletedAt: 'asc' },
    take: DELETED_USER_PURGE_BATCH,
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

async function hardDeleteDeletedUser(
  tx: Db,
  user: {
    id: string;
    googleSub: string;
    email: string;
    googleBanned: boolean;
    dataDeletedAt: Date | null;
  },
) {
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

  // No FK on these columns — clear before row delete.
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
        retentionDays: DELETED_USER_RETENTION_DAYS,
      },
    },
  });
}
