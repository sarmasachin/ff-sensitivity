import { Injectable } from '@nestjs/common';
import { RedeemCodeStatus, RedeemMode, RedeemSecretStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { maskRedeemCode } from './redeem-mask';
import { RedeemScratchService } from './redeem-scratch.service';

@Injectable()
export class RedeemCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scratchService: RedeemScratchService,
  ) {}

  async catalog(userId: string) {
    const now = new Date();
    const codes = await this.prisma.redeemCode.findMany({
      where: {
        status: {
          in: [
            RedeemCodeStatus.ACTIVE,
            RedeemCodeStatus.EXHAUSTED,
            RedeemCodeStatus.EXPIRED,
            RedeemCodeStatus.PAUSED,
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            secrets: { where: { status: RedeemSecretStatus.UNUSED } },
          },
        },
      },
    });

    const claims = await this.prisma.redeemClaim.findMany({
      where: { userId },
      select: { redeemCodeId: true, codeSecret: true },
    });
    const claimMap = new Map(
      claims.map((c) => [c.redeemCodeId, c.codeSecret] as const),
    );

    const scratchIds = codes
      .filter((c) => c.mode === RedeemMode.SCRATCH_REWARD)
      .map((c) => c.id);
    const scratchMeta = new Map<
      string,
      Awaited<ReturnType<RedeemScratchService['scratchMeta']>>
    >();
    await Promise.all(
      scratchIds.map(async (id) => {
        scratchMeta.set(id, await this.scratchService.scratchMeta(userId, id));
      }),
    );

    const [types, cadences] = await Promise.all([
      this.prisma.redeemTypeDef.findMany({
        where: { enabled: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.redeemCadenceDef.findMany({
        where: { enabled: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      types: types.map((t) => ({ id: t.id, label: t.label })),
      cadences: cadences.map((c) => ({
        id: c.id,
        label: c.label,
        claimLimit: c.claimLimit,
        windowHours: c.windowHours,
      })),
      items: codes.map((row) => {
        const mine = claimMap.get(row.id);
        const claimedByMe = Boolean(mine);
        const expiredByTime =
          row.expiresAt != null && row.expiresAt.getTime() <= now.getTime();
        const scheduleEnded =
          row.endsAt != null && row.endsAt.getTime() <= now.getTime();
        const scheduleNotStarted =
          row.startsAt != null && row.startsAt.getTime() > now.getTime();

        if (row.mode === RedeemMode.SCRATCH_REWARD) {
          const poolLeft = row._count.secrets;
          const meta = scratchMeta.get(row.id) ?? {
            usedAttempts: 0,
            allowedAttempts: 1,
            needsAd: false,
            canScratch: true,
          };
          const listStatus =
            expiredByTime ||
            scheduleEnded ||
            row.status === RedeemCodeStatus.EXPIRED
              ? 'CLAIMED'
              : row.status === RedeemCodeStatus.PAUSED || scheduleNotStarted
                ? 'CLAIMED'
                : row.status === RedeemCodeStatus.ACTIVE
                  ? 'ACTIVE'
                  : 'CLAIMED';
          return {
            id: row.id,
            type: row.type,
            title: row.title,
            valueLabel: row.valueLabel,
            codeMasked: mine ? maskRedeemCode(mine) : '••••-COINS',
            code: claimedByMe ? mine : null,
            status: listStatus,
            expiresLabel: row.expiresLabel,
            tip: row.tip?.trim() || RedeemScratchService.SAFE_TIP,
            redeemUrl: row.redeemUrl,
            stockLeft: poolLeft,
            coinCost: null as number | null,
            cadence: row.cadence,
            unlocked: claimedByMe,
            mode: row.mode,
            coinRewardMin: row.coinRewardMin,
            coinRewardMax: row.coinRewardMax,
            startsAt: row.startsAt?.toISOString() ?? null,
            endsAt: row.endsAt?.toISOString() ?? null,
            windowMinutes: row.windowMinutes,
            codesPerWindow: row.codesPerWindow,
            poolLeft,
            needsAd: meta.needsAd,
            canScratch: meta.canScratch && listStatus === 'ACTIVE',
          };
        }

        const listStatus =
          expiredByTime || row.status === RedeemCodeStatus.EXPIRED
            ? 'CLAIMED'
            : row.status === RedeemCodeStatus.ACTIVE && row.stockLeft > 0
              ? claimedByMe
                ? 'CLAIMED'
                : 'ACTIVE'
              : row.status === RedeemCodeStatus.EXHAUSTED || row.stockLeft <= 0
                ? 'CLAIMED'
                : row.status === RedeemCodeStatus.ACTIVE
                  ? 'ACTIVE'
                  : 'CLAIMED';

        return {
          id: row.id,
          type: row.type,
          title: row.title,
          valueLabel: row.valueLabel,
          codeMasked: maskRedeemCode(row.codeSecret),
          code: claimedByMe ? mine : null,
          status: listStatus,
          expiresLabel: row.expiresLabel,
          tip: row.tip,
          redeemUrl: row.redeemUrl,
          stockLeft: row.stockLeft,
          coinCost: row.coinCost,
          cadence: row.cadence,
          unlocked: claimedByMe,
          mode: row.mode,
          coinRewardMin: null as number | null,
          coinRewardMax: null as number | null,
          startsAt: null as string | null,
          endsAt: null as string | null,
          windowMinutes: row.windowMinutes,
          codesPerWindow: row.codesPerWindow,
          poolLeft: null as number | null,
          needsAd: false,
          canScratch: false,
        };
      }),
    };
  }
}
