"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceLabelFrom = deviceLabelFrom;
exports.buildShopSnapshot = buildShopSnapshot;
exports.listShopPurchases = listShopPurchases;
function deviceLabelFrom(model, brand) {
    return [model, brand].filter((part) => Boolean(part && part.trim())).join(' · ');
}
function buildShopSnapshot(snap) {
    return {
        oneTime: snap.oneTime,
        title: snap.title,
        category: snap.category,
        deviceId: snap.deviceId,
        deviceLabel: snap.deviceLabel,
    };
}
function auditTitle(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return '';
    const title = value.title;
    return typeof title === 'string' ? title.trim() : '';
}
async function titlesFromAudit(prisma, itemIds) {
    const titles = new Map();
    if (itemIds.length === 0)
        return titles;
    const logs = await prisma.auditLog.findMany({
        where: {
            entity: { in: itemIds.map((id) => `shop:${id}`) },
            action: { in: ['shop.create', 'shop.update', 'shop.delete'] },
        },
        orderBy: { createdAt: 'desc' },
        select: { entity: true, afterJson: true },
    });
    for (const log of logs) {
        const id = log.entity.startsWith('shop:') ? log.entity.slice('shop:'.length) : '';
        if (!id || titles.has(id))
            continue;
        const title = auditTitle(log.afterJson);
        if (title)
            titles.set(id, title);
    }
    return titles;
}
function readSnapshot(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const row = value;
    if (typeof row.oneTime !== 'boolean')
        return null;
    if (typeof row.title !== 'string' || !row.title.trim())
        return null;
    return {
        oneTime: row.oneTime,
        title: row.title,
        category: typeof row.category === 'string' ? row.category : '',
        deviceId: typeof row.deviceId === 'string' ? row.deviceId : '',
        deviceLabel: typeof row.deviceLabel === 'string' ? row.deviceLabel : '',
    };
}
async function listShopPurchases(prisma) {
    const [rows, items] = await Promise.all([
        prisma.walletLedger.findMany({
            where: { reason: { startsWith: 'shop:' } },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        displayName: true,
                        googleName: true,
                        deviceInstalls: {
                            orderBy: { lastSeenAt: 'desc' },
                            take: 1,
                            select: { installId: true, model: true, brand: true },
                        },
                    },
                },
            },
        }),
        prisma.shopItem.findMany({
            select: { id: true, title: true, oneTime: true, category: true },
        }),
    ]);
    const byId = new Map(items.map((item) => [item.id, item]));
    const missing = [];
    for (const row of rows) {
        const itemId = row.reason.startsWith('shop:')
            ? row.reason.slice('shop:'.length)
            : row.reason;
        if (readSnapshot(row.shopSnapshot)?.title)
            continue;
        if (byId.has(itemId))
            continue;
        if (!missing.includes(itemId))
            missing.push(itemId);
    }
    const auditTitles = await titlesFromAudit(prisma, missing);
    return {
        purchases: rows.map((row) => {
            const itemId = row.reason.startsWith('shop:')
                ? row.reason.slice('shop:'.length)
                : row.reason;
            const item = byId.get(itemId);
            const saved = readSnapshot(row.shopSnapshot);
            const install = row.user.deviceInstalls[0];
            const liveLabel = deviceLabelFrom(install?.model, install?.brand);
            return {
                id: row.id,
                userId: row.user.id,
                email: row.user.email,
                googleName: row.user.googleName.trim(),
                displayName: row.user.displayName.trim() || 'User',
                deviceId: saved ? saved.deviceId : (install?.installId ?? ''),
                deviceLabel: saved ? saved.deviceLabel : liveLabel,
                itemId,
                itemTitle: saved?.title || item?.title || auditTitles.get(itemId) || itemId,
                category: saved ? saved.category : (item?.category ?? ''),
                oneTime: saved ? saved.oneTime : (item?.oneTime ?? false),
                coins: Math.abs(row.delta),
                balanceAfter: row.balanceAfter,
                createdAt: row.createdAt.toISOString(),
            };
        }),
    };
}
//# sourceMappingURL=shop-purchases.js.map