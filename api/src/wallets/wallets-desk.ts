import type { PrismaService } from '../prisma/prisma.service';

export type WalletDeskStats = {
  total: number;
  frozen: number;
  zero: number;
  coinsInCirculation: number;
  staffMoves: number;
};

export type WalletLife = {
  earned: number;
  spent: number;
  lastAt: Date | null;
};

function num(v: bigint | number | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type LifeRow = {
  user_id: string;
  earned: bigint;
  spent: bigint;
  last_at: Date | null;
};

function toLife(row: LifeRow): WalletLife {
  return {
    earned: num(row.earned),
    spent: num(row.spent),
    lastAt: row.last_at ? new Date(row.last_at) : null,
  };
}

/** Full-table wallet cards. Not the length of a capped list. */
export async function countWalletDeskStats(
  prisma: PrismaService,
): Promise<WalletDeskStats> {
  const [row] = await prisma.$queryRaw<
    Array<{
      total: bigint;
      frozen: bigint;
      zero: bigint;
      coins: bigint;
    }>
  >`
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE wallet_frozen)::bigint AS frozen,
      COUNT(*) FILTER (WHERE coins = 0)::bigint AS zero,
      COALESCE(SUM(coins), 0)::bigint AS coins
    FROM users
  `;
  const [staff] = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(*)::bigint AS n
    FROM wallet_ledger
    WHERE reason LIKE 'staff:grant%'
       OR reason LIKE 'staff:revoke%'
  `;
  return {
    total: num(row?.total),
    frozen: num(row?.frozen),
    zero: num(row?.zero),
    coinsInCirculation: num(row?.coins),
    staffMoves: num(staff?.n),
  };
}

/** Earned, spent, and last ledger time for every user. Full history. */
export async function loadWalletLifetimes(
  prisma: PrismaService,
): Promise<Map<string, WalletLife>> {
  const rows = await prisma.$queryRaw<LifeRow[]>`
    SELECT
      user_id,
      COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)::bigint AS earned,
      COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0)::bigint AS spent,
      MAX(created_at) AS last_at
    FROM wallet_ledger
    GROUP BY user_id
  `;
  const map = new Map<string, WalletLife>();
  for (const row of rows) map.set(row.user_id, toLife(row));
  return map;
}

export async function loadWalletLifetime(
  prisma: PrismaService,
  userId: string,
): Promise<WalletLife | undefined> {
  const rows = await prisma.$queryRaw<LifeRow[]>`
    SELECT
      user_id,
      COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)::bigint AS earned,
      COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0)::bigint AS spent,
      MAX(created_at) AS last_at
    FROM wallet_ledger
    WHERE user_id = ${userId}
    GROUP BY user_id
  `;
  const row = rows[0];
  return row ? toLife(row) : undefined;
}
