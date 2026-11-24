"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PROMOS = void 0;
exports.stamp = stamp;
exports.parseStamp = parseStamp;
exports.sanitizeText = sanitizeText;
exports.sanitizePromoId = sanitizePromoId;
exports.assertSafeDeepLink = assertSafeDeepLink;
exports.assertPromo = assertPromo;
exports.assertPromos = assertPromos;
exports.promoWriteData = promoWriteData;
exports.toPromoRow = toPromoRow;
exports.rethrowUnique = rethrowUnique;
exports.auditPromos = auditPromos;
exports.compactPromoOrders = compactPromoOrders;
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
exports.MAX_PROMOS = 40;
const ALLOWED_DEEP_PATHS = new Set([
    'home',
    'challenge',
    'daily_challenge',
    'scratch',
    'shop',
    'coin_shop',
    'redeem',
    'names',
    'stylish',
]);
function stamp(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function parseStamp(raw) {
    const m = raw
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
    if (!m) {
        throw new app_error_1.AppError('PROMOS_BAD_STAMP', 'Invalid schedule stamp.', 400);
    }
    const [, y, mo, d, h, mi] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0, 0);
    if (!Number.isFinite(dt.getTime())) {
        throw new app_error_1.AppError('PROMOS_BAD_STAMP', 'Invalid schedule stamp.', 400);
    }
    return dt;
}
function sanitizeText(raw, max) {
    return [...raw]
        .filter((ch) => {
        const code = ch.codePointAt(0) ?? 0;
        if (code < 0x20 || code === 0x7f)
            return false;
        if (code >= 0x200b && code <= 0x200f)
            return false;
        if (code === 0xfeff)
            return false;
        return true;
    })
        .join('')
        .trim()
        .slice(0, max);
}
function sanitizePromoId(raw) {
    const id = (raw ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 64);
    if (!id || id.includes('/')) {
        throw new app_error_1.AppError('PROMOS_BAD_ID', 'Invalid promo id.', 400);
    }
    return id;
}
function assertSafeDeepLink(raw) {
    const link = sanitizeText(raw, 120).toLowerCase();
    let parsed;
    try {
        parsed = new URL(link);
    }
    catch {
        throw new app_error_1.AppError('PROMOS_BAD_LINK', 'Deep link is invalid.', 400);
    }
    if (parsed.protocol !== 'ffops:') {
        throw new app_error_1.AppError('PROMOS_BAD_LINK', 'Deep link must use the ffops:// scheme.', 400);
    }
    if (parsed.username || parsed.password) {
        throw new app_error_1.AppError('PROMOS_BAD_LINK', 'Deep link must not include credentials.', 400);
    }
    const path = (parsed.hostname || parsed.pathname.replace(/^\//, ''))
        .split('/')[0]
        ?.replace(/[^a-z0-9_]/g, '');
    if (!path || !ALLOWED_DEEP_PATHS.has(path)) {
        throw new app_error_1.AppError('PROMOS_BAD_LINK', 'Deep link path is not allowlisted.', 400);
    }
    return `ffops://${path}`;
}
function assertPromo(row) {
    const title = sanitizeText(row.title, 80);
    if (!title) {
        throw new app_error_1.AppError('PROMOS_VALIDATION', 'Title is required.', 400);
    }
    const start = parseStamp(row.startsAt);
    const end = parseStamp(row.endsAt);
    if (end.getTime() <= start.getTime()) {
        throw new app_error_1.AppError('PROMOS_BAD_WINDOW', `Promo “${row.id}” end must be after start.`, 400);
    }
    assertSafeDeepLink(row.deepLink);
}
function assertPromos(rows) {
    const ids = new Set();
    for (const row of rows) {
        if (ids.has(row.id)) {
            throw new app_error_1.AppError('PROMOS_DUP_ID', `Duplicate promo id “${row.id}”.`, 400);
        }
        ids.add(row.id);
        assertPromo(row);
    }
}
function promoWriteData(row) {
    assertPromo(row);
    return {
        id: sanitizePromoId(row.id),
        title: sanitizeText(row.title, 80),
        subtitle: sanitizeText(row.subtitle, 160),
        imageLabel: sanitizeText(row.imageLabel, 64).toLowerCase() || 'untitled',
        deepLink: assertSafeDeepLink(row.deepLink),
        placement: row.placement,
        sortOrder: row.sortOrder,
        enabled: row.enabled,
        startsAt: parseStamp(row.startsAt),
        endsAt: parseStamp(row.endsAt),
    };
}
function toPromoRow(p) {
    return {
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        imageLabel: p.imageLabel,
        deepLink: p.deepLink,
        placement: p.placement,
        sortOrder: p.sortOrder,
        enabled: p.enabled,
        startsAt: stamp(p.startsAt),
        endsAt: stamp(p.endsAt),
        updatedAt: stamp(p.updatedAt),
    };
}
function rethrowUnique(e, code, message) {
    if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002') {
        throw new app_error_1.AppError(code, message, 409);
    }
    throw e;
}
async function auditPromos(prisma, adminId, action, entity, after) {
    await prisma.auditLog.create({
        data: {
            actorAdminId: adminId,
            action,
            entity,
            afterJson: (after ?? {}),
        },
    });
}
async function compactPromoOrders(tx) {
    const rows = await tx.promo.findMany({
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        select: { id: true, sortOrder: true },
    });
    for (let i = 0; i < rows.length; i++) {
        const next = i + 1;
        if (rows[i].sortOrder !== next) {
            await tx.promo.update({
                where: { id: rows[i].id },
                data: { sortOrder: next },
            });
        }
    }
}
//# sourceMappingURL=promos-shared.js.map