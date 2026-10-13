import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';

export type RedeemVoteTally = {
  yesCount: number;
  noCount: number;
  myVote: boolean | null;
};

@Injectable()
export class RedeemVoteService {
  constructor(private readonly prisma: PrismaService) {}

  async cast(userId: string, redeemCodeId: string, worked: boolean) {
    const code = await this.prisma.redeemCode.findUnique({
      where: { id: redeemCodeId },
      select: { id: true },
    });
    if (!code) {
      throw new AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
    }
    const existing = await this.prisma.redeemCodeVote.findUnique({
      where: { userId_redeemCodeId: { userId, redeemCodeId } },
      select: { id: true },
    });
    if (!existing) {
      try {
        await this.prisma.redeemCodeVote.create({
          data: { userId, redeemCodeId, worked },
        });
      } catch (err) {
        if (
          !(err instanceof Prisma.PrismaClientKnownRequestError) ||
          err.code !== 'P2002'
        ) {
          throw err;
        }
      }
    }
    const tally = await this.tally(userId, [redeemCodeId]);
    const slot = tally.get(redeemCodeId) ?? {
      yesCount: 0,
      noCount: 0,
      myVote: worked,
    };
    return {
      worked: slot.myVote === true,
      yesCount: slot.yesCount,
      noCount: slot.noCount,
    };
  }

  async tally(userId: string, codeIds: string[]) {
    const out = new Map<string, RedeemVoteTally>();
    for (const id of codeIds) {
      out.set(id, { yesCount: 0, noCount: 0, myVote: null });
    }
    if (codeIds.length === 0) return out;

    const [grouped, mine] = await Promise.all([
      this.prisma.redeemCodeVote.groupBy({
        by: ['redeemCodeId', 'worked'],
        where: { redeemCodeId: { in: codeIds } },
        _count: { _all: true },
      }),
      this.prisma.redeemCodeVote.findMany({
        where: { userId, redeemCodeId: { in: codeIds } },
        select: { redeemCodeId: true, worked: true },
      }),
    ]);

    for (const row of grouped) {
      const slot = out.get(row.redeemCodeId);
      if (!slot) continue;
      if (row.worked) slot.yesCount = row._count._all;
      else slot.noCount = row._count._all;
    }
    for (const row of mine) {
      const slot = out.get(row.redeemCodeId);
      if (slot) slot.myVote = row.worked;
    }
    return out;
  }
}
