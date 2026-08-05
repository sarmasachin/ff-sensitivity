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
exports.NamesService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const CONFIG_ID = 1;
const MAX_AFFIX = 32;
function sanitizeAffix(raw) {
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
        .slice(0, MAX_AFFIX);
}
function isBlockedRemoteHost(hostname) {
    const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) {
        return true;
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
        const [a, b] = h.split('.').map((n) => Number(n));
        if (a === 0 || a === 10 || a === 127)
            return true;
        if (a === 169 && b === 254)
            return true;
        if (a === 172 && b >= 16 && b <= 31)
            return true;
        if (a === 192 && b === 168)
            return true;
        if (a === 100 && b >= 64 && b <= 127)
            return true;
    }
    if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
        return true;
    }
    return false;
}
function assertSafeRemoteUrl(enabled, urlRaw) {
    const url = (urlRaw ?? '').trim();
    if (!enabled)
        return null;
    if (!url) {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL is required when sync is enabled.', 400);
    }
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL is invalid.', 400);
    }
    if (parsed.protocol !== 'https:') {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL must use https.', 400);
    }
    if (parsed.username || parsed.password) {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL must not include credentials.', 400);
    }
    if (isBlockedRemoteHost(parsed.hostname)) {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL host is not allowed.', 400);
    }
    if (url.length > 500) {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL is too long.', 400);
    }
    return url;
}
function assertUniqueIds(frames, fonts) {
    const frameIds = new Set();
    for (const f of frames) {
        if (frameIds.has(f.id)) {
            throw new app_error_1.AppError('NAMES_DUP_FRAME', `Duplicate frame id “${f.id}”.`, 400);
        }
        frameIds.add(f.id);
        if (!sanitizeAffix(f.prefix) && !sanitizeAffix(f.suffix)) {
            throw new app_error_1.AppError('NAMES_EMPTY_FRAME', `Frame “${f.id}” needs a prefix or suffix.`, 400);
        }
    }
    const fontIds = new Set();
    for (const f of fonts) {
        if (fontIds.has(f.id)) {
            throw new app_error_1.AppError('NAMES_DUP_FONT', `Duplicate font id “${f.id}”.`, 400);
        }
        fontIds.add(f.id);
    }
    if (![...fontIds].some((id) => fonts.find((f) => f.id === id)?.enabled)) {
        throw new app_error_1.AppError('NAMES_NO_FONT', 'At least one letter font must stay enabled.', 400);
    }
}
let NamesService = class NamesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureDefaults() {
        await this.prisma.namesConfig.upsert({
            where: { id: CONFIG_ID },
            update: {},
            create: { id: CONFIG_ID },
        });
    }
    mapPolicy(row) {
        return {
            maxNameChars: row.maxNameChars,
            maxBatchSize: row.maxBatchSize,
            blockSpaces: !row.allowSpacesInInput,
            requireStyleWrap: row.requireStyleWrap,
            remotePackEnabled: row.remotePackEnabled,
            remotePackUrl: row.remotePackUrl ?? '',
        };
    }
    async adminGetBundle() {
        await this.ensureDefaults();
        const [cfg, frames, fonts] = await Promise.all([
            this.prisma.namesConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
            this.prisma.nameFrame.findMany({ orderBy: { sortOrder: 'asc' } }),
            this.prisma.nameFont.findMany({ orderBy: { sortOrder: 'asc' } }),
        ]);
        return {
            policy: this.mapPolicy(cfg),
            frames: frames.map((f) => ({
                id: f.id,
                label: f.label,
                prefix: f.prefix,
                suffix: f.suffix,
                premium: f.premium,
                enabled: f.enabled,
            })),
            fonts: fonts.map((f) => ({
                id: f.id,
                label: f.label,
                sample: f.sample,
                enabled: f.enabled,
            })),
        };
    }
    async adminSave(adminId, dto) {
        assertUniqueIds(dto.frames, dto.fonts);
        const remoteUrl = assertSafeRemoteUrl(dto.policy.remotePackEnabled, dto.policy.remotePackUrl);
        await this.prisma.$transaction(async (tx) => {
            await tx.namesConfig.upsert({
                where: { id: CONFIG_ID },
                update: {
                    maxNameChars: dto.policy.maxNameChars,
                    maxBatchSize: dto.policy.maxBatchSize,
                    allowSpacesInInput: !dto.policy.blockSpaces,
                    requireStyleWrap: dto.policy.requireStyleWrap,
                    remotePackEnabled: dto.policy.remotePackEnabled,
                    remotePackUrl: remoteUrl,
                },
                create: {
                    id: CONFIG_ID,
                    maxNameChars: dto.policy.maxNameChars,
                    maxBatchSize: dto.policy.maxBatchSize,
                    allowSpacesInInput: !dto.policy.blockSpaces,
                    requireStyleWrap: dto.policy.requireStyleWrap,
                    remotePackEnabled: dto.policy.remotePackEnabled,
                    remotePackUrl: remoteUrl,
                },
            });
            await tx.nameFrame.deleteMany({});
            if (dto.frames.length > 0) {
                await tx.nameFrame.createMany({
                    data: dto.frames.map((f, i) => ({
                        id: f.id,
                        label: f.label.trim().slice(0, 80),
                        prefix: sanitizeAffix(f.prefix),
                        suffix: sanitizeAffix(f.suffix),
                        premium: f.premium,
                        enabled: f.enabled,
                        sortOrder: i,
                    })),
                });
            }
            await tx.nameFont.deleteMany({});
            await tx.nameFont.createMany({
                data: dto.fonts.map((f, i) => ({
                    id: f.id,
                    label: f.label.trim().slice(0, 80),
                    sample: f.sample.trim().slice(0, 120),
                    enabled: f.enabled,
                    sortOrder: i,
                })),
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId: adminId,
                    action: 'names.save',
                    entity: 'names_config:default',
                    afterJson: {
                        frames: dto.frames.length,
                        fonts: dto.fonts.length,
                        maxNameChars: dto.policy.maxNameChars,
                    },
                },
            });
        });
        return this.adminGetBundle();
    }
    async userCatalog() {
        await this.ensureDefaults();
        const [cfg, frames, fonts] = await Promise.all([
            this.prisma.namesConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
            this.prisma.nameFrame.findMany({
                where: { enabled: true },
                orderBy: { sortOrder: 'asc' },
            }),
            this.prisma.nameFont.findMany({
                where: { enabled: true },
                orderBy: { sortOrder: 'asc' },
            }),
        ]);
        return {
            policy: {
                maxNameChars: cfg.maxNameChars,
                maxBatchSize: cfg.maxBatchSize,
                blockSpaces: !cfg.allowSpacesInInput,
                requireStyleWrap: cfg.requireStyleWrap,
            },
            frames: frames.map((f) => ({
                id: f.id,
                label: f.label,
                prefix: f.prefix,
                suffix: f.suffix,
                premium: f.premium,
            })),
            fonts: fonts.map((f) => ({
                id: f.id,
                label: f.label,
                sample: f.sample,
            })),
        };
    }
};
exports.NamesService = NamesService;
exports.NamesService = NamesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NamesService);
//# sourceMappingURL=names.service.js.map