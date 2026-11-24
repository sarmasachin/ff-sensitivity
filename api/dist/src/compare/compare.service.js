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
exports.CompareService = void 0;
const common_1 = require("@nestjs/common");
const app_config_service_1 = require("../app-config/app-config.service");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const compare_promax_offset_1 = require("./compare-promax-offset");
const compare_promax_peer_load_1 = require("./compare-promax-peer-load");
const LIST_USERS = 50;
const DAILY_LIMIT = 30;
let CompareService = class CompareService {
    prisma;
    appConfig;
    constructor(prisma, appConfig) {
        this.prisma = prisma;
        this.appConfig = appConfig;
    }
    async list(fingersRaw, roleRaw) {
        const fingers = (0, compare_promax_offset_1.cleanFilter)(fingersRaw);
        const role = (0, compare_promax_offset_1.cleanFilter)(roleRaw);
        const [matched, everyone, recent] = await Promise.all([
            fingers && role ? this.sumOffset(fingers, role) : Promise.resolve({ sum: 0, n: 0 }),
            this.sumOffset(),
            this.prisma.$queryRaw `
        SELECT * FROM (
          SELECT DISTINCT ON (sc.user_id)
            sc.id,
            sc.user_id,
            u.display_name,
            sc.device_label,
            sc.fingers,
            sc.role,
            sc.dpi_preference,
            sc.screen_guard,
            sc.feedback,
            sc.suggested_general,
            sc.suggested_red_dot,
            sc.suggested_scope_2x,
            sc.suggested_scope_4x,
            sc.suggested_sniper,
            sc.suggested_free_look,
            sc.suggested_fire_button,
            sc.actual_general,
            sc.actual_red_dot,
            sc.actual_scope_2x,
            sc.actual_scope_4x,
            sc.actual_sniper,
            sc.actual_free_look,
            sc.actual_fire_button,
            sc.created_at
          FROM sensitivity_compares sc
          INNER JOIN users u ON u.id = sc.user_id
          WHERE u.email NOT LIKE 'e2e.promax.%'
            AND u.google_sub NOT LIKE 'e2e-promax-%'
            AND u.display_name NOT IN (
              'ProMax Peer A',
              'ProMax Peer B',
              'ProMax E2E Viewer'
            )
          ORDER BY sc.user_id, sc.created_at DESC
        ) latest
        ORDER BY latest.created_at DESC
        LIMIT ${LIST_USERS}
      `,
        ]);
        const use = matched.n > 0 ? matched : everyone;
        const items = recent.map((row) => ({
            id: row.id,
            displayName: (row.display_name ?? '').trim() || 'Player',
            deviceLabel: row.device_label,
            fingers: row.fingers,
            role: row.role,
            dpiPreference: row.dpi_preference,
            screenGuard: row.screen_guard,
            feedback: row.feedback,
            suggested: {
                general: row.suggested_general,
                redDot: row.suggested_red_dot,
                scope2x: row.suggested_scope_2x,
                scope4x: row.suggested_scope_4x,
                sniper: row.suggested_sniper,
                freeLook: row.suggested_free_look,
                fireButton: row.suggested_fire_button,
            },
            actual: {
                general: row.actual_general,
                redDot: row.actual_red_dot,
                scope2x: row.actual_scope_2x,
                scope4x: row.actual_scope_4x,
                sniper: row.actual_sniper,
                freeLook: row.actual_free_look,
                fireButton: row.actual_fire_button,
            },
            createdAt: new Date(row.created_at).toISOString(),
        }));
        return {
            offsetFrom: matched.n > 0 ? 'match' : 'all',
            averageGeneralOffset: use.n === 0 ? null : Math.trunc(use.sum / use.n),
            items,
        };
    }
    async promaxOffset(query) {
        const [result, shareConflict] = await Promise.all([
            (0, compare_promax_offset_1.resolveProMaxOffsets)(this.prisma, query),
            this.appConfig.publicProMaxShareConflict(),
        ]);
        return { ...result, shareConflict };
    }
    async save(userId, dto) {
        const deviceLabel = dto.deviceLabel.trim();
        const fingers = dto.fingers.trim();
        const role = dto.role.trim();
        const dpiPreference = dto.dpiPreference.trim();
        const screenGuard = dto.screenGuard.trim();
        if (!deviceLabel || !fingers || !role || !dpiPreference || !screenGuard) {
            throw new app_error_1.AppError('COMPARE_INVALID', 'Enter the comparison details.', 400);
        }
        if (sameSensitivity(dto.suggested, dto.actual)) {
            throw new app_error_1.AppError('COMPARE_SAME_AS_APP', 'Enter your Free Fire sensitivity — not the same numbers as the app suggestion.', 400);
        }
        const ramGb = dto.ramGb != null && Number.isFinite(dto.ramGb) && dto.ramGb > 0
            ? Math.round(dto.ramGb * 10) / 10
            : null;
        const processorBrand = (0, compare_promax_offset_1.cleanFilter)(dto.processorBrand) || null;
        const processorType = (0, compare_promax_offset_1.cleanFilter)(dto.processorType, 80) || null;
        const gpuLabel = (0, compare_promax_offset_1.cleanFilter)(dto.gpuLabel, 80) || null;
        const gpuVendor = (0, compare_promax_offset_1.cleanFilter)(dto.gpuVendor) || null;
        const refreshHz = dto.refreshHz != null && Number.isFinite(dto.refreshHz) && dto.refreshHz > 0
            ? Math.round(dto.refreshHz)
            : null;
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        const row = await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { id: true, isActive: true },
            });
            if (!user || !user.isActive) {
                throw new app_error_1.AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
            }
            const today = await tx.sensitivityCompare.count({
                where: { userId, createdAt: { gte: start } },
            });
            if (today >= DAILY_LIMIT) {
                throw new app_error_1.AppError('COMPARE_DAILY_LIMIT', 'You can save 30 comparisons a day. Try again tomorrow.', 429);
            }
            return tx.sensitivityCompare.create({
                data: {
                    userId,
                    deviceLabel,
                    fingers,
                    role,
                    dpiPreference,
                    screenGuard,
                    ramGb,
                    ramBucket: ramGb != null ? (0, compare_promax_offset_1.ramBucket)(ramGb) : null,
                    processorBrand,
                    processorType,
                    gpuLabel,
                    gpuVendor,
                    refreshHz,
                    refreshBucket: refreshHz != null ? (0, compare_promax_offset_1.refreshBucket)(refreshHz) : null,
                    engine: (0, compare_promax_peer_load_1.normalizeCompareEngine)(dto.engine),
                    feedback: dto.feedback,
                    suggestedGeneral: dto.suggested.general,
                    suggestedRedDot: dto.suggested.redDot,
                    suggestedScope2x: dto.suggested.scope2x,
                    suggestedScope4x: dto.suggested.scope4x,
                    suggestedSniper: dto.suggested.sniper,
                    suggestedFreeLook: dto.suggested.freeLook,
                    suggestedFireButton: dto.suggested.fireButton,
                    actualGeneral: dto.actual.general,
                    actualRedDot: dto.actual.redDot,
                    actualScope2x: dto.actual.scope2x,
                    actualScope4x: dto.actual.scope4x,
                    actualSniper: dto.actual.sniper,
                    actualFreeLook: dto.actual.freeLook,
                    actualFireButton: dto.actual.fireButton,
                },
            });
        });
        return { id: row.id, createdAt: row.createdAt.toISOString() };
    }
    async sumOffset(fingers, role) {
        const rows = fingers && role
            ? await this.prisma.$queryRaw `
            SELECT COALESCE(SUM(actual_general - suggested_general), 0)::int AS sum,
                   COUNT(*)::int AS n
            FROM sensitivity_compares
            WHERE fingers = ${fingers} AND role = ${role}`
            : await this.prisma.$queryRaw `
            SELECT COALESCE(SUM(actual_general - suggested_general), 0)::int AS sum,
                   COUNT(*)::int AS n
            FROM sensitivity_compares`;
        const row = rows[0] ?? { sum: 0, n: 0 };
        return { sum: Number(row.sum), n: Number(row.n) };
    }
};
exports.CompareService = CompareService;
exports.CompareService = CompareService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_service_1.AppConfigService])
], CompareService);
function sameSensitivity(a, b) {
    return (a.general === b.general &&
        a.redDot === b.redDot &&
        a.scope2x === b.scope2x &&
        a.scope4x === b.scope4x &&
        a.sniper === b.sniper &&
        a.freeLook === b.freeLook &&
        a.fireButton === b.fireButton);
}
function values(row, side) {
    if (side === 'suggested') {
        return {
            general: row.suggestedGeneral,
            redDot: row.suggestedRedDot,
            scope2x: row.suggestedScope2x,
            scope4x: row.suggestedScope4x,
            sniper: row.suggestedSniper,
            freeLook: row.suggestedFreeLook,
            fireButton: row.suggestedFireButton,
        };
    }
    return {
        general: row.actualGeneral,
        redDot: row.actualRedDot,
        scope2x: row.actualScope2x,
        scope4x: row.actualScope4x,
        sniper: row.actualSniper,
        freeLook: row.actualFreeLook,
        fireButton: row.actualFireButton,
    };
}
//# sourceMappingURL=compare.service.js.map