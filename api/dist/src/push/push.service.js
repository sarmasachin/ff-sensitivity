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
exports.PushService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const push_security_1 = require("./push-security");
const push_fcm_1 = require("./push-fcm");
const devices_service_1 = require("../devices/devices.service");
const devices_security_1 = require("../devices/devices-security");
const MAX_CAMPAIGNS = 100;
function assertCampaignId(id) {
    const clean = (0, push_security_1.sanitizePushText)(id, 64).toLowerCase();
    if (!/^[a-z0-9_]{1,64}$/.test(clean)) {
        throw new app_error_1.AppError('PUSH_BAD_ID', 'Campaign id is invalid.', 400);
    }
    return clean;
}
let PushService = class PushService {
    prisma;
    devices;
    constructor(prisma, devices) {
        this.prisma = prisma;
        this.devices = devices;
    }
    toRow(c) {
        return {
            id: c.id,
            title: c.title,
            body: c.body,
            deepLink: c.deepLink,
            audience: c.audience,
            topic: c.topic,
            status: c.status,
            scheduledAt: (0, push_security_1.stamp)(c.scheduledAt),
            sentAt: (0, push_security_1.stamp)(c.sentAt),
            delivered: c.delivered,
            failed: c.failed,
            createdBy: c.createdBy,
            updatedAt: (0, push_security_1.stamp)(c.updatedAt) ?? '',
        };
    }
    async adminList() {
        const rows = await this.prisma.pushCampaign.findMany({
            orderBy: { updatedAt: 'desc' },
            take: MAX_CAMPAIGNS,
        });
        return { campaigns: rows.map((r) => this.toRow(r)) };
    }
    async adminUpsert(admin, dto) {
        const title = (0, push_security_1.sanitizePushText)(dto.title, 65);
        const body = (0, push_security_1.sanitizePushText)(dto.body, 180);
        if (!title)
            throw new app_error_1.AppError('PUSH_VALIDATION', 'Title is required.', 400);
        if (!body)
            throw new app_error_1.AppError('PUSH_VALIDATION', 'Body is required.', 400);
        (0, push_security_1.assertSafePushText)(title, 'Title');
        (0, push_security_1.assertSafePushText)(body, 'Body');
        const deepLink = (0, push_security_1.assertSafeDeepLink)(dto.deepLink);
        const audience = dto.audience;
        let topic = '';
        if (audience === client_1.PushAudience.TOPIC) {
            topic = (0, push_security_1.assertTopic)(dto.topic ?? '');
        }
        let status = client_1.PushStatus.DRAFT;
        let scheduledAt = null;
        if (dto.scheduleMode === 'later') {
            if (!dto.scheduledAt) {
                throw new app_error_1.AppError('PUSH_BAD_STAMP', 'Schedule stamp required.', 400);
            }
            status = client_1.PushStatus.SCHEDULED;
            scheduledAt = (0, push_security_1.parseStamp)(dto.scheduledAt);
        }
        const existing = await this.prisma.pushCampaign.findUnique({
            where: { id: dto.id },
        });
        if (existing &&
            (existing.status === client_1.PushStatus.SENT ||
                existing.status === client_1.PushStatus.FAILED)) {
            throw new app_error_1.AppError('PUSH_LOCKED', 'Sent/failed campaigns cannot be edited.', 400);
        }
        const count = await this.prisma.pushCampaign.count();
        if (!existing && count >= MAX_CAMPAIGNS) {
            throw new app_error_1.AppError('PUSH_LIMIT', 'Campaign limit reached.', 400);
        }
        const createdBy = existing?.createdBy ??
            (admin.email.split('@')[0] || 'admin').slice(0, 40);
        const row = await this.prisma.pushCampaign.upsert({
            where: { id: dto.id },
            create: {
                id: dto.id,
                title,
                body,
                deepLink,
                audience,
                topic,
                status,
                scheduledAt,
                createdBy,
            },
            update: {
                title,
                body,
                deepLink,
                audience,
                topic,
                status,
                scheduledAt,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: existing ? 'push.update' : 'push.create',
                entity: 'push_campaign',
                afterJson: { id: row.id, status: row.status, audience: row.audience },
            },
        });
        return { campaign: this.toRow(row) };
    }
    async adminSend(admin, id) {
        id = assertCampaignId(id);
        if (admin.role !== client_1.AdminRole.SUPER_ADMIN &&
            admin.role !== client_1.AdminRole.ADMIN) {
            throw new app_error_1.AppError('PUSH_SEND_FORBIDDEN', 'Only Super Admin / Admin can send push campaigns.', 403);
        }
        const campaign = await this.prisma.pushCampaign.findUnique({ where: { id } });
        if (!campaign) {
            throw new app_error_1.AppError('PUSH_NOT_FOUND', 'Campaign not found.', 404);
        }
        if (campaign.status !== client_1.PushStatus.DRAFT &&
            campaign.status !== client_1.PushStatus.SCHEDULED) {
            throw new app_error_1.AppError('PUSH_BAD_STATUS', 'Only draft or scheduled campaigns can be sent.', 400);
        }
        const tokens = await this.resolveAudienceTokens(campaign);
        let delivered = 0;
        let failed = 0;
        let mode = 'token_ledger';
        try {
            const fcm = await (0, push_fcm_1.sendFcmCampaign)({
                title: campaign.title,
                body: campaign.body,
                deepLink: campaign.deepLink,
                audience: campaign.audience,
                topic: campaign.topic,
                tokens,
            });
            delivered = fcm.delivered;
            failed = fcm.failed;
            await this.markSuspectedUninstalls(fcm.unregisteredTokens);
            mode = 'fcm';
        }
        catch (e) {
            if (e instanceof app_error_1.AppError &&
                e.code === 'PUSH_FCM_UNCONFIGURED') {
                delivered = tokens.length;
                mode = 'token_ledger';
            }
            else {
                throw e;
            }
        }
        const updated = await this.prisma.pushCampaign.update({
            where: { id },
            data: {
                status: client_1.PushStatus.SENT,
                sentAt: new Date(),
                delivered,
                failed,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: 'push.send',
                entity: 'push_campaign',
                afterJson: {
                    id,
                    delivered,
                    failed,
                    audience: campaign.audience,
                    mode,
                },
            },
        });
        return { campaign: this.toRow(updated) };
    }
    async markSuspectedUninstalls(tokens) {
        if (tokens.length === 0)
            return;
        const rows = await this.prisma.devicePushToken.findMany({
            where: { token: { in: tokens } },
            select: { installId: true },
        });
        const installIds = [
            ...new Set(rows.map((row) => row.installId).filter(Boolean)),
        ];
        await this.prisma.devicePushToken.updateMany({
            where: { token: { in: tokens } },
            data: { pushEnabled: false },
        });
        for (const installId of installIds) {
            const stillLive = await this.prisma.devicePushToken.findFirst({
                where: { installId, pushEnabled: true },
                select: { token: true },
            });
            if (stillLive) {
                await this.prisma.deviceInstall.updateMany({
                    where: { installId },
                    data: {
                        hasFcmToken: true,
                        fcmTokenHint: `${stillLive.token.slice(0, 4)}…${stillLive.token.slice(-4)}`,
                        pushEnabled: true,
                        uninstallSuspectedAt: null,
                    },
                });
            }
            else {
                await this.prisma.deviceInstall.updateMany({
                    where: { installId },
                    data: {
                        hasFcmToken: false,
                        fcmTokenHint: '',
                        pushEnabled: false,
                        uninstallSuspectedAt: new Date(),
                    },
                });
            }
        }
    }
    async adminCancel(admin, id) {
        id = assertCampaignId(id);
        const campaign = await this.prisma.pushCampaign.findUnique({ where: { id } });
        if (!campaign) {
            throw new app_error_1.AppError('PUSH_NOT_FOUND', 'Campaign not found.', 404);
        }
        if (campaign.status !== client_1.PushStatus.DRAFT &&
            campaign.status !== client_1.PushStatus.SCHEDULED) {
            throw new app_error_1.AppError('PUSH_BAD_STATUS', 'Only draft or scheduled campaigns can be cancelled.', 400);
        }
        const updated = await this.prisma.pushCampaign.update({
            where: { id },
            data: { status: client_1.PushStatus.CANCELLED },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: 'push.cancel',
                entity: 'push_campaign',
                afterJson: { id },
            },
        });
        return { campaign: this.toRow(updated) };
    }
    async adminDelete(admin, id) {
        id = assertCampaignId(id);
        const campaign = await this.prisma.pushCampaign.findUnique({ where: { id } });
        if (!campaign) {
            throw new app_error_1.AppError('PUSH_NOT_FOUND', 'Campaign not found.', 404);
        }
        if (campaign.status === client_1.PushStatus.SENT) {
            throw new app_error_1.AppError('PUSH_LOCKED', 'Sent campaigns cannot be deleted (audit trail).', 400);
        }
        await this.prisma.pushCampaign.delete({ where: { id } });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: 'push.delete',
                entity: 'push_campaign',
                afterJson: { id },
            },
        });
        return { ok: true };
    }
    async registerDevice(userId, dto) {
        const token = (0, push_security_1.sanitizePushText)(dto.token, 512);
        if (token.length < 8) {
            throw new app_error_1.AppError('PUSH_BAD_TOKEN', 'Device token is invalid.', 400);
        }
        if (/[\s<>]/.test(token) || token.toLowerCase().includes('javascript:')) {
            throw new app_error_1.AppError('PUSH_BAD_TOKEN', 'Device token is invalid.', 400);
        }
        const platform = dto.platform === 'ios' ? 'ios' : 'android';
        const topics = (dto.topics ?? [])
            .map((t) => (0, push_security_1.sanitizePushText)(t, 64).toLowerCase())
            .filter((t) => /^[a-z0-9_]{1,64}$/.test(t))
            .slice(0, 20);
        let installId;
        if (dto.installId) {
            await this.devices.assertInstallAllowed(userId, dto.installId);
            installId = (0, devices_security_1.assertInstallId)(dto.installId);
        }
        else {
            await this.devices.assertInstallAllowed(userId);
        }
        const row = await this.prisma.devicePushToken.upsert({
            where: { token },
            create: {
                userId,
                token,
                platform,
                topics,
                installId,
                pushEnabled: true,
                lastSeenAt: new Date(),
            },
            update: {
                userId,
                platform,
                topics,
                ...(installId ? { installId } : {}),
                pushEnabled: true,
                lastSeenAt: new Date(),
            },
        });
        if (installId) {
            await this.prisma.devicePushToken.updateMany({
                where: { installId, token: { not: token } },
                data: { pushEnabled: false },
            });
            await this.prisma.deviceInstall.updateMany({
                where: { installId, userId },
                data: {
                    hasFcmToken: true,
                    fcmTokenHint: `${token.slice(0, 4)}…${token.slice(-4)}`,
                    pushEnabled: true,
                    uninstallSuspectedAt: null,
                },
            });
        }
        return {
            ok: true,
            platform: row.platform,
            topics: row.topics,
            tokenHint: `${token.slice(0, 4)}…${token.slice(-4)}`,
        };
    }
    async inbox(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { createdAt: true },
        });
        if (!user) {
            return { messages: [] };
        }
        const signedUpAt = user.createdAt;
        const [tokens, claimCount, rows] = await Promise.all([
            this.prisma.devicePushToken.findMany({
                where: { userId, pushEnabled: true },
                select: { topics: true },
            }),
            this.prisma.redeemClaim.count({ where: { userId } }),
            this.prisma.pushCampaign.findMany({
                where: {
                    status: client_1.PushStatus.SENT,
                    sentAt: { gte: signedUpAt },
                },
                orderBy: { sentAt: 'desc' },
                take: 40,
            }),
        ]);
        const topics = new Set(tokens.flatMap((t) => t.topics));
        const hasClaim = claimCount > 0;
        const messages = rows
            .filter((r) => {
            if (r.audience === client_1.PushAudience.ALL)
                return true;
            if (r.audience === client_1.PushAudience.ACTIVE_7D)
                return true;
            if (r.audience === client_1.PushAudience.NO_CLAIM)
                return !hasClaim;
            if (r.audience === client_1.PushAudience.TOPIC) {
                return Boolean(r.topic) && topics.has(r.topic);
            }
            return false;
        })
            .slice(0, 20)
            .map((r) => ({
            id: r.id,
            title: r.title,
            body: r.body,
            deepLink: r.deepLink,
            sentAt: (0, push_security_1.stamp)(r.sentAt),
        }));
        return { messages };
    }
    async resolveAudienceTokens(campaign) {
        const enabled = { pushEnabled: true };
        let rows = [];
        const select = { token: true, userId: true, installId: true };
        if (campaign.audience === client_1.PushAudience.ALL) {
            rows = await this.prisma.devicePushToken.findMany({
                where: enabled,
                select,
                take: 5000,
            });
        }
        else if (campaign.audience === client_1.PushAudience.ACTIVE_7D) {
            const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            rows = await this.prisma.devicePushToken.findMany({
                where: { ...enabled, lastSeenAt: { gte: since } },
                select,
                take: 5000,
            });
        }
        else if (campaign.audience === client_1.PushAudience.NO_CLAIM) {
            rows = await this.prisma.devicePushToken.findMany({
                where: {
                    ...enabled,
                    user: { claims: { none: {} } },
                },
                select,
                take: 5000,
            });
        }
        else {
            rows = await this.prisma.devicePushToken.findMany({
                where: {
                    ...enabled,
                    topics: { has: campaign.topic },
                },
                select,
                take: 5000,
            });
        }
        const allowed = await this.devices.filterEnabledTokens(rows);
        return allowed.map((r) => r.token);
    }
    async resolveAudienceCount(campaign) {
        return (await this.resolveAudienceTokens(campaign)).length;
    }
};
exports.PushService = PushService;
exports.PushService = PushService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        devices_service_1.DevicesService])
], PushService);
//# sourceMappingURL=push.service.js.map