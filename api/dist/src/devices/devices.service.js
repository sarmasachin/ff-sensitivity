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
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const analytics_service_1 = require("../analytics/analytics.service");
const devices_security_1 = require("./devices-security");
let DevicesService = class DevicesService {
    prisma;
    analytics;
    constructor(prisma, analytics) {
        this.prisma = prisma;
        this.analytics = analytics;
    }
    toRow(row, now = new Date()) {
        const status = (0, devices_security_1.computeDeviceStatus)({
            blocked: row.blocked,
            lastSeenAt: row.lastSeenAt,
            now,
        });
        const h = (0, devices_security_1.hoursAgo)(row.lastSeenAt, now);
        const labelParts = [
            row.model || row.brand || 'Device',
            row.androidVersion ? `Android ${row.androidVersion}` : '',
        ].filter(Boolean);
        return {
            id: row.id,
            deviceId: row.installId,
            label: labelParts.join(' · '),
            brand: row.brand,
            model: row.model,
            androidVersion: row.androidVersion,
            appVersion: row.appVersion,
            appVersionCode: row.appVersionCode,
            fcmTokenMasked: row.hasFcmToken
                ? row.fcmTokenHint || 'fcm_…****'
                : '—',
            hasFcmToken: row.hasFcmToken,
            status,
            lastSeenLabel: (0, devices_security_1.formatLastSeen)(h),
            lastSeenHoursAgo: Math.round(h * 10) / 10,
            pushEnabled: row.pushEnabled && row.hasFcmToken && !row.blocked,
            coinBalance: row.user?.coins ?? 0,
            note: row.note,
        };
    }
    async heartbeat(userId, dto) {
        const installId = (0, devices_security_1.assertInstallId)(dto.installId);
        const brand = (0, devices_security_1.sanitizeDeviceText)(dto.brand ?? '', 40);
        const model = (0, devices_security_1.sanitizeDeviceText)(dto.model ?? '', 60);
        const androidVersion = (0, devices_security_1.sanitizeDeviceText)(dto.androidVersion ?? '', 20);
        const appVersion = (0, devices_security_1.sanitizeDeviceText)(dto.appVersion ?? '', 32);
        const appVersionCode = Math.max(0, Math.min(999999, dto.appVersionCode ?? 0));
        (0, devices_security_1.assertSafeDeviceText)(brand || 'ok', 'Brand');
        (0, devices_security_1.assertSafeDeviceText)(model || 'ok', 'Model');
        (0, devices_security_1.assertSafeDeviceText)(androidVersion || 'ok', 'Android version');
        (0, devices_security_1.assertSafeDeviceText)(appVersion || 'ok', 'App version');
        const existing = await this.prisma.deviceInstall.findUnique({
            where: { installId },
        });
        if (existing?.userId && existing.userId !== userId) {
            throw new app_error_1.AppError('DEVICE_OWNED', 'This install is already linked to another account.', 403);
        }
        const pushTok = await this.prisma.devicePushToken.findFirst({
            where: {
                userId,
                pushEnabled: true,
                OR: [{ installId }, { installId: null }],
            },
            orderBy: { lastSeenAt: 'desc' },
        });
        let hasFcmToken = false;
        let fcmTokenHint = '';
        if (pushTok) {
            fcmTokenHint = (0, devices_security_1.maskFcmToken)(pushTok.token);
            hasFcmToken = true;
            if (!pushTok.installId) {
                await this.prisma.devicePushToken.update({
                    where: { id: pushTok.id },
                    data: { installId },
                });
            }
        }
        if (existing?.blocked) {
            await this.prisma.deviceInstall.update({
                where: { installId },
                data: {
                    userId,
                    brand: brand || existing.brand,
                    model: model || existing.model,
                    androidVersion: androidVersion || existing.androidVersion,
                    appVersion: appVersion || existing.appVersion,
                    appVersionCode: appVersionCode || existing.appVersionCode,
                    uninstallSuspectedAt: null,
                    lastSeenAt: new Date(),
                },
            });
            return {
                ok: true,
                blocked: true,
                message: 'This device is blocked by ops.',
            };
        }
        await this.prisma.deviceInstall.upsert({
            where: { installId },
            create: {
                installId,
                userId,
                brand,
                model,
                androidVersion,
                appVersion,
                appVersionCode,
                fcmTokenHint,
                hasFcmToken,
                pushEnabled: hasFcmToken,
                uninstallSuspectedAt: null,
                lastSeenAt: new Date(),
            },
            update: {
                userId,
                brand: brand || undefined,
                model: model || undefined,
                androidVersion: androidVersion || undefined,
                appVersion: appVersion || undefined,
                appVersionCode,
                fcmTokenHint,
                hasFcmToken,
                pushEnabled: hasFcmToken,
                uninstallSuspectedAt: null,
                lastSeenAt: new Date(),
            },
        });
        this.analytics.trackSafe({
            name: 'home_open',
            userId,
            installId,
        });
        return { ok: true, blocked: false };
    }
    async adminList() {
        const rows = await this.prisma.deviceInstall.findMany({
            orderBy: { lastSeenAt: 'desc' },
            take: 500,
            include: { user: { select: { coins: true } } },
        });
        const now = new Date();
        return { devices: rows.map((r) => this.toRow(r, now)) };
    }
    assertCanMutate(admin) {
        if (admin.role === client_1.AdminRole.VIEWER) {
            throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Viewers cannot change device registry.', 403);
        }
    }
    async loadOrThrow(id) {
        const row = await this.prisma.deviceInstall.findUnique({
            where: { id },
            include: { user: { select: { coins: true } } },
        });
        if (!row) {
            throw new app_error_1.AppError('DEVICE_NOT_FOUND', 'Device not found.', 404);
        }
        return row;
    }
    async adminBlock(admin, id) {
        this.assertCanMutate(admin);
        id = (0, devices_security_1.sanitizeDeviceText)(id, 40);
        if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
            throw new app_error_1.AppError('DEVICE_BAD_ID', 'Invalid device id.', 400);
        }
        const row = await this.loadOrThrow(id);
        const note = (0, devices_security_1.sanitizeDeviceText)(`${row.note} · Blocked by staff.`.trim(), 400);
        const updated = await this.prisma.deviceInstall.update({
            where: { id },
            data: {
                blocked: true,
                pushEnabled: false,
                note,
            },
            include: { user: { select: { coins: true } } },
        });
        if (updated.installId) {
            await this.prisma.devicePushToken.updateMany({
                where: { installId: updated.installId },
                data: { pushEnabled: false },
            });
        }
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: 'devices.block',
                entity: 'device_install',
                afterJson: { id, installId: updated.installId },
            },
        });
        return { device: this.toRow(updated) };
    }
    async adminUnblock(admin, id) {
        this.assertCanMutate(admin);
        id = (0, devices_security_1.sanitizeDeviceText)(id, 40);
        if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
            throw new app_error_1.AppError('DEVICE_BAD_ID', 'Invalid device id.', 400);
        }
        const row = await this.loadOrThrow(id);
        const updated = await this.prisma.deviceInstall.update({
            where: { id },
            data: {
                blocked: false,
                pushEnabled: row.hasFcmToken,
                note: 'Unblocked by staff. Push restored if token present.',
            },
            include: { user: { select: { coins: true } } },
        });
        if (updated.hasFcmToken && updated.installId) {
            await this.prisma.devicePushToken.updateMany({
                where: { installId: updated.installId },
                data: { pushEnabled: true },
            });
        }
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: 'devices.unblock',
                entity: 'device_install',
                afterJson: { id, installId: updated.installId },
            },
        });
        return { device: this.toRow(updated) };
    }
    async adminInvalidateToken(admin, id) {
        this.assertCanMutate(admin);
        id = (0, devices_security_1.sanitizeDeviceText)(id, 40);
        if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
            throw new app_error_1.AppError('DEVICE_BAD_ID', 'Invalid device id.', 400);
        }
        const row = await this.loadOrThrow(id);
        if (!row.hasFcmToken) {
            throw new app_error_1.AppError('DEVICE_NO_TOKEN', 'No FCM token on this device.', 400);
        }
        await this.prisma.devicePushToken.updateMany({
            where: { installId: row.installId },
            data: { pushEnabled: false },
        });
        const updated = await this.prisma.deviceInstall.update({
            where: { id },
            data: {
                hasFcmToken: false,
                fcmTokenHint: '',
                pushEnabled: false,
                note: (0, devices_security_1.sanitizeDeviceText)(`${row.note} · FCM token invalidated by staff.`.trim(), 400),
            },
            include: { user: { select: { coins: true } } },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: 'devices.invalidate_token',
                entity: 'device_install',
                afterJson: { id, installId: updated.installId },
            },
        });
        return { device: this.toRow(updated) };
    }
    async adminPatchNote(admin, id, dto) {
        this.assertCanMutate(admin);
        id = (0, devices_security_1.sanitizeDeviceText)(id, 40);
        if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
            throw new app_error_1.AppError('DEVICE_BAD_ID', 'Invalid device id.', 400);
        }
        const note = (0, devices_security_1.sanitizeDeviceText)(dto.note ?? '', 400);
        (0, devices_security_1.assertSafeDeviceText)(note || 'ok', 'Note');
        await this.loadOrThrow(id);
        const updated = await this.prisma.deviceInstall.update({
            where: { id },
            data: { note },
            include: { user: { select: { coins: true } } },
        });
        return { device: this.toRow(updated) };
    }
    async assertInstallAllowed(userId, installIdRaw) {
        if (!installIdRaw)
            return;
        const installId = (0, devices_security_1.assertInstallId)(installIdRaw);
        const row = await this.prisma.deviceInstall.findUnique({
            where: { installId },
        });
        if (row?.blocked) {
            throw new app_error_1.AppError('DEVICE_BLOCKED', 'This device is blocked by ops.', 403);
        }
        if (row?.userId && row.userId !== userId) {
            throw new app_error_1.AppError('DEVICE_OWNED', 'This install is already linked to another account.', 403);
        }
    }
    async assertInstallNotBlocked(installIdRaw) {
        const installId = (0, devices_security_1.assertInstallId)(installIdRaw);
        const row = await this.prisma.deviceInstall.findUnique({
            where: { installId },
            select: { blocked: true },
        });
        if (row?.blocked) {
            throw new app_error_1.AppError('DEVICE_BLOCKED', 'This device is blocked by ops.', 403);
        }
    }
    async filterEnabledTokens(rows) {
        if (rows.length === 0)
            return rows;
        const installIds = [
            ...new Set(rows.map((r) => r.installId).filter(Boolean)),
        ];
        if (installIds.length === 0)
            return rows;
        const blocked = await this.prisma.deviceInstall.findMany({
            where: { blocked: true, installId: { in: installIds } },
            select: { installId: true },
        });
        if (blocked.length === 0)
            return rows;
        const blockedInstalls = new Set(blocked.map((b) => b.installId));
        return rows.filter((r) => !r.installId || !blockedInstalls.has(r.installId));
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_service_1.AnalyticsService])
], DevicesService);
//# sourceMappingURL=devices.service.js.map