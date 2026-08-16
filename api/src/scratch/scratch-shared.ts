import { Prisma, ScratchPrizeKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import type { ScratchPrizeDto } from './dto/scratch.dto';

export const CONFIG_ID = 'default';

export const DEFAULT_CONFIG = {
  coinsPercent: 55,
  redeemPercent: 45,
  coinAmount: 50,
  retentionDays: 30,
  autoPurge: true,
  showExpired: false,
};

export async function ensureScratchDefaults(prisma: PrismaService) {
  await prisma.scratchConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: { id: CONFIG_ID, ...DEFAULT_CONFIG },
  });
}

export function mapPrize(p: {
  id: string;
  title: string;
  detail: string;
  kind: ScratchPrizeKind;
  rewardLabel: string;
  coinReward: number;
  oddsPercent: number;
  enabled: boolean;
  streakDays: number | null;
}) {
  return {
    id: p.id,
    title: p.title,
    detail: p.detail,
    kind: p.kind,
    rewardLabel: p.rewardLabel,
    coinReward: p.coinReward,
    oddsPercent: p.oddsPercent,
    enabled: p.enabled,
    streakDays: p.streakDays,
  };
}

export function sanitizeId(raw: string, fallback: string): string {
  const id = (raw?.trim() || fallback)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 64);
  if (!id || id.includes('/')) {
    throw new AppError('SCRATCH_BAD_ID', 'Invalid prize id.', 400);
  }
  return id;
}

export function prizeWriteData(p: ScratchPrizeDto, sortOrder: number) {
  return {
    id: sanitizeId(p.id, `prize_${sortOrder + 1}`),
    title: p.title.trim(),
    detail: p.detail.trim(),
    kind: p.kind as ScratchPrizeKind,
    rewardLabel: p.rewardLabel.trim(),
    coinReward: p.coinReward,
    oddsPercent: p.oddsPercent,
    enabled: p.enabled,
    streakDays: p.streakDays ?? null,
    sortOrder,
  };
}

export function assertOutcomeOdds(odds: {
  coinsPercent: number;
  redeemPercent: number;
  coinAmount: number;
}) {
  if (
    odds.coinsPercent < 0 ||
    odds.redeemPercent < 0 ||
    odds.coinsPercent > 100 ||
    odds.redeemPercent > 100
  ) {
    throw new AppError('SCRATCH_BAD_ODDS', 'Odds must be 0–100.', 400);
  }
  if (odds.coinsPercent + odds.redeemPercent !== 100) {
    throw new AppError(
      'SCRATCH_BAD_ODDS',
      'Coins % + Redeem % must total 100.',
      400,
    );
  }
  if (odds.coinAmount < 0 || odds.coinAmount > 100_000) {
    throw new AppError('SCRATCH_BAD_AMOUNT', 'Invalid coin amount.', 400);
  }
}

export function assertPrizes(prizes: ScratchPrizeDto[]) {
  if (prizes.length > 200) {
    throw new AppError('SCRATCH_PRIZE_LIMIT', 'Too many prizes.', 400);
  }
  const ids = new Set<string>();
  for (const p of prizes) {
    const id = sanitizeId(p.id, 'prize');
    if (ids.has(id)) {
      throw new AppError('SCRATCH_DUP_PRIZE', `Duplicate prize id: ${id}`, 400);
    }
    ids.add(id);
    if (p.kind === 'MILESTONE' && (p.streakDays == null || p.streakDays < 1)) {
      throw new AppError(
        'SCRATCH_BAD_MILESTONE',
        'Milestone prizes need streak days.',
        400,
      );
    }
  }
}

export async function auditScratch(
  prisma: PrismaService,
  adminId: string,
  action: string,
  entity: string,
  afterJson: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: { actorAdminId: adminId, action, entity, afterJson },
  });
}

export function rethrowUnique(err: unknown, code: string, message: string): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    throw new AppError(code, message, 409);
  }
  throw err;
}
