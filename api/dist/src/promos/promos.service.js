"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromosService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
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
function assertPromos(rows) {
    const ids = new Set();
    for (const row of rows) {
        if (ids.has(row.id)) {
            throw new app_error_1.AppError('PROMOS_DUP_ID', `Duplicate promo id “${row.id}”.`, 400);
        }
        ids.add(row.id);
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
}
let PromosService = class PromosService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    toRow(p) {
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
    async adminList() {
        const rows = await this.prisma.promo.findMany({
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        });
        return { promos: rows.map((r) => this.toRow(r)) };
    }
    async adminSave(adminId, dto) {
        assertPromos(dto.promos);
        const normalized = dto.promos
            .map((row) => ({
            id: row.id,
            title: sanitizeText(row.title, 80),
            subtitle: sanitizeText(row.subtitle, 160),
            imageLabel: sanitizeText(row.imageLabel, 64).toLowerCase() || 'untitled',
            deepLink: assertSafeDeepLink(row.deepLink),
            placement: row.placement,
            sortOrder: row.sortOrder,
            enabled: row.enabled,
            startsAt: parseStamp(row.startsAt),
            endsAt: parseStamp(row.endsAt),
        }))
            .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
            .map((row, i) => ({ ...row, sortOrder: i + 1 }));
        await this.prisma.$transaction(async (tx) => {
            await tx.promo.deleteMany({});
            if (normalized.length > 0) {
                await tx.promo.createMany({ data: normalized });
            }
            await tx.auditLog.create({
                data: {
                    actorAdminId: adminId,
                    action: 'promos.save',
                    entity: 'promos:catalog',
                    afterJson: { count: normalized.length },
                },
            });
        });
        return this.adminList();
    }
    async liveCatalog() {
        const now = new Date();
        const rows = await this.prisma.promo.findMany({
            where: {
                enabled: true,
                startsAt: { lte: now },
                endsAt: { gte: now },
            },
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            take: 40,
        });
        return {
            promos: rows.map((r) => ({
                id: r.id,
                title: r.title,
                subtitle: r.subtitle,
                imageLabel: r.imageLabel,
                deepLink: r.deepLink,
                placement: r.placement,
                sortOrder: r.sortOrder,
            })),
        };
    }
};
exports.PromosService = PromosService;
exports.PromosService = PromosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PromosService);
//# sourceMappingURL=promos.service.js.map