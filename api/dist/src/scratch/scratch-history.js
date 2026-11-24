"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveScratchArchive = saveScratchArchive;
exports.listScratchHistory = listScratchHistory;
const client_1 = require("@prisma/client");
const DAY_MS = 24 * 60 * 60 * 1000;
async function saveScratchArchive(prisma, row) {
    await prisma.scratchArchiveEntry.upsert({
        where: {
            userId_sourceKey: { userId: row.userId, sourceKey: row.sourceKey },
        },
        create: {
            userId: row.userId,
            sourceKey: row.sourceKey,
            kind: row.kind,
            title: row.title,
            detail: row.detail,
            rewardLabel: row.rewardLabel,
            coins: row.coins,
            badge: row.badge ?? null,
        },
        update: {},
    });
}
function shopSourceKey(idempotencyKey) {
    if (!idempotencyKey.includes('pack_scratch_bonus'))
        return null;
    if (idempotencyKey.endsWith(':once'))
        return 'shop:pack_scratch_bonus:once';
    const marker = ':pack_scratch_bonus:req:';
    const at = idempotencyKey.indexOf(marker);
    if (at < 0)
        return null;
    const req = idempotencyKey.slice(at + marker.length).trim();
    if (req.length < 8)
        return null;
    return `shop:pack_scratch_bonus:${req}`;
}
async function repairArchiveFromLedger(prisma, userId) {
    const ledgers = await prisma.walletLedger.findMany({
        where: {
            userId,
            OR: [
                { reason: { startsWith: 'earn:milestone:' } },
                { reason: 'shop:pack_scratch_bonus' },
            ],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    if (ledgers.length === 0)
        return;
    const have = new Set((await prisma.scratchArchiveEntry.findMany({
        where: { userId },
        select: { sourceKey: true },
    })).map((row) => row.sourceKey));
    const days = ledgers
        .map((row) => {
        if (!row.reason.startsWith('earn:milestone:'))
            return 0;
        const n = Number(row.reason.slice('earn:milestone:'.length));
        return Number.isInteger(n) ? n : 0;
    })
        .filter((n) => n > 0);
    const milestones = days.length === 0
        ? []
        : await prisma.challengeMilestone.findMany({ where: { days: { in: days } } });
    const shop = ledgers.some((row) => row.reason === 'shop:pack_scratch_bonus')
        ? await prisma.shopItem.findUnique({ where: { id: 'pack_scratch_bonus' } })
        : null;
    const data = [];
    for (const row of ledgers) {
        if (row.reason.startsWith('earn:milestone:')) {
            const n = Number(row.reason.slice('earn:milestone:'.length));
            if (!Number.isInteger(n) || n < 1)
                continue;
            const sourceKey = `milestone:${n}`;
            if (have.has(sourceKey))
                continue;
            const fromDb = milestones.find((m) => m.days === n);
            const title = fromDb?.title?.trim() || `Day ${n}`;
            data.push({
                userId,
                sourceKey,
                kind: 'MILESTONE',
                title: `Day ${n} · ${title}`,
                detail: 'Daily Challenge streak reward',
                rewardLabel: fromDb?.rewardLabel?.trim() || `+${row.delta} coins`,
                coins: row.delta,
                badge: fromDb?.badge ?? null,
                createdAt: row.createdAt,
            });
            have.add(sourceKey);
            continue;
        }
        const sourceKey = shopSourceKey(row.idempotencyKey);
        if (!sourceKey || have.has(sourceKey))
            continue;
        data.push({
            userId,
            sourceKey,
            kind: 'SHOP',
            title: shop?.title?.trim() || 'Scratch pack',
            detail: 'Coin Shop purchase',
            rewardLabel: shop?.rewardTag?.trim() || 'Scratch pack',
            coins: 0,
            badge: null,
            createdAt: row.createdAt,
        });
        have.add(sourceKey);
    }
    if (data.length === 0)
        return;
    await prisma.scratchArchiveEntry.createMany({ data, skipDuplicates: true });
}
async function listScratchHistory(prisma, userId) {
    await repairArchiveFromLedger(prisma, userId);
    const config = await prisma.scratchConfig.findUnique({ where: { id: 'default' } });
    const retentionDays = Math.min(365, Math.max(1, config?.retentionDays ?? 30));
    const showExpired = config?.showExpired === true;
    const cutoff = new Date(Date.now() - retentionDays * DAY_MS);
    const fresh = showExpired ? {} : { createdAt: { gte: cutoff } };
    const [rolls, extras, claims] = await Promise.all([
        prisma.scratchRoll.findMany({
            where: { userId, title: { not: 'pending' }, ...fresh },
            orderBy: { createdAt: 'desc' },
            take: 100,
        }),
        prisma.scratchArchiveEntry.findMany({
            where: { userId, ...fresh },
            orderBy: { createdAt: 'desc' },
            take: 100,
        }),
        prisma.redeemClaim.findMany({
            where: { userId, ...fresh },
            include: {
                redeemCode: { select: { title: true, valueLabel: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        }),
    ]);
    const claimCode = new Map(claims.map((row) => [row.redeemCodeId, row.codeSecret]));
    const rollRedeemIds = new Set(rolls.map((row) => row.redeemCodeId).filter((id) => !!id));
    const items = [];
    for (const roll of rolls) {
        const redeem = roll.outcome === client_1.ScratchRollOutcome.REDEEM && !!roll.redeemCodeId;
        items.push({
            id: roll.id,
            kind: redeem ? 'REDEEM' : 'GIFT',
            title: roll.title,
            detail: 'Daily scratch roll',
            rewardLabel: roll.rewardLabel,
            code: redeem ? claimCode.get(roll.redeemCodeId) ?? null : null,
            coins: roll.coinDelta,
            badge: null,
            scratchedAt: roll.createdAt.toISOString(),
        });
    }
    for (const claim of claims) {
        if (rollRedeemIds.has(claim.redeemCodeId))
            continue;
        items.push({
            id: claim.id,
            kind: 'REDEEM',
            title: claim.redeemCode.title,
            detail: claim.redeemCode.valueLabel,
            rewardLabel: claim.redeemCode.valueLabel,
            code: claim.codeSecret,
            coins: 0,
            badge: null,
            scratchedAt: claim.createdAt.toISOString(),
        });
    }
    for (const extra of extras) {
        const kind = extra.kind === 'SHOP' ? 'SHOP' : 'MILESTONE';
        items.push({
            id: extra.id,
            kind,
            title: extra.title,
            detail: extra.detail,
            rewardLabel: extra.rewardLabel,
            code: null,
            coins: extra.coins,
            badge: extra.badge,
            scratchedAt: extra.createdAt.toISOString(),
        });
    }
    items.sort((a, b) => Date.parse(b.scratchedAt) - Date.parse(a.scratchedAt));
    return { retentionDays, showExpired, items };
}
//# sourceMappingURL=scratch-history.js.map