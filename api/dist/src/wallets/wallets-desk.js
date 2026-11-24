"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countWalletDeskStats = countWalletDeskStats;
exports.loadWalletLifetimes = loadWalletLifetimes;
exports.loadWalletLifetime = loadWalletLifetime;
function num(v) {
    if (v == null)
        return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
function toLife(row) {
    return {
        earned: num(row.earned),
        spent: num(row.spent),
        lastAt: row.last_at ? new Date(row.last_at) : null,
    };
}
async function countWalletDeskStats(prisma) {
    const [row] = await prisma.$queryRaw `
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE wallet_frozen)::bigint AS frozen,
      COUNT(*) FILTER (WHERE coins = 0)::bigint AS zero,
      COALESCE(SUM(coins), 0)::bigint AS coins
    FROM users
  `;
    const [staff] = await prisma.$queryRaw `
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
async function loadWalletLifetimes(prisma) {
    const rows = await prisma.$queryRaw `
    SELECT
      user_id,
      COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)::bigint AS earned,
      COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0)::bigint AS spent,
      MAX(created_at) AS last_at
    FROM wallet_ledger
    GROUP BY user_id
  `;
    const map = new Map();
    for (const row of rows)
        map.set(row.user_id, toLife(row));
    return map;
}
async function loadWalletLifetime(prisma, userId) {
    const rows = await prisma.$queryRaw `
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
//# sourceMappingURL=wallets-desk.js.map