import { PrismaService } from '../prisma/prisma.service';
import type { PeerOffsetRow } from './compare-promax-peer-quality';

const MAX_ROWS = 400;

const PEER_SELECT = {
  userId: true,
  deviceLabel: true,
  feedback: true,
  createdAt: true,
  actualGeneral: true,
  suggestedGeneral: true,
  actualRedDot: true,
  suggestedRedDot: true,
  actualScope2x: true,
  suggestedScope2x: true,
  actualScope4x: true,
  suggestedScope4x: true,
  actualSniper: true,
  suggestedSniper: true,
  actualFreeLook: true,
  suggestedFreeLook: true,
  actualFireButton: true,
  suggestedFireButton: true,
} as const;

export function mapPeer(row: {
  userId: string;
  deviceLabel: string;
  feedback: string;
  createdAt: Date;
  actualGeneral: number;
  suggestedGeneral: number;
  actualRedDot: number;
  suggestedRedDot: number;
  actualScope2x: number;
  suggestedScope2x: number;
  actualScope4x: number;
  suggestedScope4x: number;
  actualSniper: number;
  suggestedSniper: number;
  actualFreeLook: number;
  suggestedFreeLook: number;
  actualFireButton: number;
  suggestedFireButton: number;
}): PeerOffsetRow {
  return {
    userId: row.userId,
    deviceLabel: row.deviceLabel,
    feedback: row.feedback,
    createdAt: row.createdAt,
    general: row.actualGeneral - row.suggestedGeneral,
    redDot: row.actualRedDot - row.suggestedRedDot,
    scope2x: row.actualScope2x - row.suggestedScope2x,
    scope4x: row.actualScope4x - row.suggestedScope4x,
    sniper: row.actualSniper - row.suggestedSniper,
    freeLook: row.actualFreeLook - row.suggestedFreeLook,
    fireButton: row.actualFireButton - row.suggestedFireButton,
  };
}

export async function loadPeers(
  prisma: PrismaService,
  where: Record<string, unknown>,
): Promise<PeerOffsetRow[]> {
  const rows = await prisma.sensitivityCompare.findMany({
    where,
    select: PEER_SELECT,
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
  });
  return rows.map(mapPeer);
}

export function excludeSelf(
  base: Record<string, unknown>,
  excludeUserId?: string,
): Record<string, unknown> {
  if (!excludeUserId) return base;
  return { ...base, userId: { not: excludeUserId } };
}

/** Canonical compare engine tags stored on SensitivityCompare.engine */
export const COMPARE_ENGINE_ONE_TAP = 'one_tap';
export const COMPARE_ENGINE_PROMAX = 'promax';

/**
 * Peer bucket filter by product engine.
 * - one_tap → only One Tap Premium saves
 * - promax / default → Pro Max + legacy null (never one_tap)
 */
export function peerEngineWhere(
  engineRaw?: string,
): Record<string, unknown> {
  const e = (engineRaw ?? '').trim().toLowerCase();
  if (e === COMPARE_ENGINE_ONE_TAP || e === 'one_tap_premium') {
    return { engine: COMPARE_ENGINE_ONE_TAP };
  }
  // Pro Max path + old rows without engine — exclude One Tap Premium bucket.
  return {
    OR: [{ engine: null }, { engine: COMPARE_ENGINE_PROMAX }],
  };
}

export function withPeerEngine(
  base: Record<string, unknown>,
  engineRaw?: string,
  excludeUserId?: string,
): Record<string, unknown> {
  return excludeSelf({ ...base, ...peerEngineWhere(engineRaw) }, excludeUserId);
}

/** Normalize client/engine enum → stored tag (null = omit / legacy). */
export function normalizeCompareEngine(raw?: string | null): string | null {
  const e = (raw ?? '').trim().toLowerCase();
  if (!e) return null;
  if (e === COMPARE_ENGINE_ONE_TAP || e === 'one_tap_premium') {
    return COMPARE_ENGINE_ONE_TAP;
  }
  if (
    e === COMPARE_ENGINE_PROMAX ||
    e === 'premium_pro_max' ||
    e === 'premium_sensi_pro_max'
  ) {
    return COMPARE_ENGINE_PROMAX;
  }
  if (e === 'best_premium') return 'best_premium';
  if (e === 'classic') return 'classic';
  return null;
}
