import { RedeemCodeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';

export function assertScratchCardOpen(
  code: {
    status: RedeemCodeStatus;
    startsAt: Date | null;
    endsAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  },
  now: Date,
) {
  if (code.status === RedeemCodeStatus.PAUSED) {
    throw new AppError(
      'REDEEM_PAUSED',
      'This scratch card is paused right now.',
      409,
    );
  }
  if (
    code.status === RedeemCodeStatus.EXPIRED ||
    (code.expiresAt != null && code.expiresAt.getTime() <= now.getTime())
  ) {
    throw new AppError('REDEEM_EXPIRED', 'This scratch card has ended.', 409);
  }
  if (code.status !== RedeemCodeStatus.ACTIVE) {
    throw new AppError(
      'REDEEM_UNAVAILABLE',
      'This scratch card is not available.',
      409,
    );
  }
  const start = code.startsAt ?? code.createdAt;
  if (now.getTime() < start.getTime()) {
    throw new AppError(
      'REDEEM_NOT_STARTED',
      'This scratch card has not started yet.',
      409,
    );
  }
  if (code.endsAt != null && now.getTime() > code.endsAt.getTime()) {
    throw new AppError(
      'REDEEM_SCHEDULE_ENDED',
      'This scratch schedule has ended.',
      409,
    );
  }
}

export async function assertRedeemSeat(
  prisma: PrismaService,
  userId: string,
) {
  const seat = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, isRestricted: true },
  });
  if (!seat || !seat.isActive) {
    throw new AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
  }
  if (seat.isRestricted) {
    throw new AppError(
      'USER_RESTRICTED',
      'Redeem is paused while this account is restricted.',
      403,
    );
  }
}
