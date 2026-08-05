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
exports.WalletsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const settings_service_1 = require("../settings/settings.service");
const wallets_security_1 = require("./wallets-security");
let WalletsService = class WalletsService {
    prisma;
    settings;
    constructor(prisma, settings) {
        this.prisma = prisma;
        this.settings = settings;
    }
    assertCanMutate(admin) {
        if (admin.role === client_1.AdminRole.VIEWER) {
            throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Viewers cannot change wallets.', 403);
        }
    }
    toWalletRow(user, now = new Date()) {
        const install = user.deviceInstalls[0];
        const deviceId = install?.installId ?? `user_${user.id.slice(-8)}`;
        const label = install?.model || install?.brand
            ? [install.model || install.brand, (0, wallets_security_1.maskEmail)(user.email)]
                .filter(Boolean)
                .join(' · ')
            : `${user.displayName || 'User'} · ${(0, wallets_security_1.maskEmail)(user.email)}`;
        let lifetimeEarned = 0;
        let lifetimeSpent = 0;
        for (const e of user.ledger) {
            if (e.delta > 0)
                lifetimeEarned += e.delta;
            if (e.delta < 0)
                lifetimeSpent += -e.delta;
        }
        const last = user.ledger[0];
        const h = last ? (0, wallets_security_1.hoursAgo)(last.createdAt, now) : (0, wallets_security_1.hoursAgo)(now, now);
        return {
            id: user.id,
            deviceId,
            label,
            balance: user.coins,
            lifetimeEarned,
            lifetimeSpent,
            status: user.walletFrozen ? 'FROZEN' : 'ACTIVE',
            lastTxnLabel: last ? (0, wallets_security_1.formatWhen)(h) : '—',
            lastTxnHoursAgo: last ? Math.round(h * 10) / 10 : 9999,
            note: user.walletNote,
        };
    }
    async adminListWallets() {
        const users = await this.prisma.user.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 500,
            select: {
                id: true,
                email: true,
                displayName: true,
                coins: true,
                walletFrozen: true,
                walletNote: true,
                deviceInstalls: {
                    orderBy: { lastSeenAt: 'desc' },
                    take: 1,
                    select: { installId: true, brand: true, model: true },
                },
                ledger: {
                    orderBy: { createdAt: 'desc' },
                    take: 200,
                    select: { delta: true, createdAt: true },
                },
            },
        });
        const now = new Date();
        return { wallets: users.map((u) => this.toWalletRow(u, now)) };
    }
    async adminListLedger() {
        const rows = await this.prisma.walletLedger.findMany({
            orderBy: { createdAt: 'desc' },
            take: 500,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        displayName: true,
                        deviceInstalls: {
                            orderBy: { lastSeenAt: 'desc' },
                            take: 1,
                            select: { installId: true, model: true, brand: true },
                        },
                    },
                },
            },
        });
        const now = new Date();
        return {
            ledger: rows.map((r) => {
                const install = r.user.deviceInstalls[0];
                const deviceId = install?.installId ?? `user_${r.userId.slice(-8)}`;
                const label = install?.model ||
                    install?.brand ||
                    r.user.displayName ||
                    (0, wallets_security_1.maskEmail)(r.user.email);
                const h = (0, wallets_security_1.hoursAgo)(r.createdAt, now);
                return {
                    id: r.id,
                    walletId: r.userId,
                    deviceId,
                    label,
                    kind: (0, wallets_security_1.mapLedgerKind)(r.reason, r.delta),
                    amount: r.delta,
                    balanceAfter: r.balanceAfter,
                    reason: r.reason,
                    whenLabel: (0, wallets_security_1.formatWhen)(h),
                    actor: (0, wallets_security_1.mapLedgerActor)(r.reason),
                };
            }),
        };
    }
    async adminGrant(admin, userIdRaw, dto) {
        this.assertCanMutate(admin);
        await this.settings.assertStepUp(admin.id, dto.currentPassword, 'wallet');
        const userId = (0, wallets_security_1.assertUserId)(userIdRaw);
        const amount = (0, wallets_security_1.assertAdjustAmount)(dto.amount);
        const reasonText = (0, wallets_security_1.sanitizeWalletText)(dto.reason, 200);
        (0, wallets_security_1.assertSafeWalletText)(reasonText, 'Reason');
        if (reasonText.length < 3) {
            throw new app_error_1.AppError('WALLET_BAD_REASON', 'Reason is required.', 400);
        }
        const requestId = (0, wallets_security_1.assertRequestId)(dto.requestId);
        const idempotencyKey = `staff:grant:${userId}:${requestId}`;
        const result = await this.prisma.$transaction(async (tx) => {
            const existing = await tx.walletLedger.findUnique({
                where: { idempotencyKey },
            });
            if (existing) {
                return { coins: existing.balanceAfter, alreadyApplied: true };
            }
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user || !user.isActive) {
                throw new app_error_1.AppError('WALLET_NOT_FOUND', 'Wallet not found.', 404);
            }
            if (user.walletFrozen) {
                throw new app_error_1.AppError('WALLET_FROZEN', 'Unfreeze the wallet before granting coins.', 409);
            }
            const nextCoins = Math.min(wallets_security_1.MAX_COINS, user.coins + amount);
            const delta = nextCoins - user.coins;
            if (delta <= 0) {
                throw new app_error_1.AppError('WALLET_CAP', 'Balance already at max.', 409);
            }
            await tx.user.update({
                where: { id: userId },
                data: {
                    coins: nextCoins,
                    walletNote: (0, wallets_security_1.sanitizeWalletText)(`Grant: ${reasonText}`, 400),
                },
            });
            await tx.walletLedger.create({
                data: {
                    userId,
                    delta,
                    balanceAfter: nextCoins,
                    reason: `staff:grant:${reasonText}`.slice(0, 200),
                    idempotencyKey,
                },
            });
            return { coins: nextCoins, alreadyApplied: false };
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: 'wallets.grant',
                entity: 'user',
                afterJson: { userId, amount, requestId, ...result },
            },
        });
        const wallets = await this.adminListWallets();
        const wallet = wallets.wallets.find((w) => w.id === userId);
        return { wallet, ...result };
    }
    async adminRevoke(admin, userIdRaw, dto) {
        this.assertCanMutate(admin);
        await this.settings.assertStepUp(admin.id, dto.currentPassword, 'wallet');
        const userId = (0, wallets_security_1.assertUserId)(userIdRaw);
        const amount = (0, wallets_security_1.assertAdjustAmount)(dto.amount);
        const reasonText = (0, wallets_security_1.sanitizeWalletText)(dto.reason, 200);
        (0, wallets_security_1.assertSafeWalletText)(reasonText, 'Reason');
        if (reasonText.length < 3) {
            throw new app_error_1.AppError('WALLET_BAD_REASON', 'Reason is required.', 400);
        }
        const requestId = (0, wallets_security_1.assertRequestId)(dto.requestId);
        const idempotencyKey = `staff:revoke:${userId}:${requestId}`;
        const result = await this.prisma.$transaction(async (tx) => {
            const existing = await tx.walletLedger.findUnique({
                where: { idempotencyKey },
            });
            if (existing) {
                return { coins: existing.balanceAfter, alreadyApplied: true };
            }
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user || !user.isActive) {
                throw new app_error_1.AppError('WALLET_NOT_FOUND', 'Wallet not found.', 404);
            }
            if (user.coins < amount) {
                throw new app_error_1.AppError('WALLET_INSUFFICIENT', `Cannot revoke ${amount} — balance is ${user.coins}.`, 409);
            }
            const paid = await tx.user.updateMany({
                where: { id: userId, coins: { gte: amount } },
                data: {
                    coins: { decrement: amount },
                    walletNote: (0, wallets_security_1.sanitizeWalletText)(`Revoke: ${reasonText}`, 400),
                },
            });
            if (paid.count !== 1) {
                throw new app_error_1.AppError('WALLET_INSUFFICIENT', 'Insufficient balance.', 409);
            }
            const updated = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            await tx.walletLedger.create({
                data: {
                    userId,
                    delta: -amount,
                    balanceAfter: updated.coins,
                    reason: `staff:revoke:${reasonText}`.slice(0, 200),
                    idempotencyKey,
                },
            });
            return { coins: updated.coins, alreadyApplied: false };
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: 'wallets.revoke',
                entity: 'user',
                afterJson: { userId, amount, requestId, ...result },
            },
        });
        const wallets = await this.adminListWallets();
        const wallet = wallets.wallets.find((w) => w.id === userId);
        return { wallet, ...result };
    }
    async adminFreeze(admin, userIdRaw, action) {
        this.assertCanMutate(admin);
        const userId = (0, wallets_security_1.assertUserId)(userIdRaw);
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isActive) {
            throw new app_error_1.AppError('WALLET_NOT_FOUND', 'Wallet not found.', 404);
        }
        const frozen = action === 'freeze';
        const note = frozen
            ? (0, wallets_security_1.sanitizeWalletText)(`${user.walletNote} · Frozen by staff.`.trim(), 400)
            : 'Unfrozen by staff. Earn/spend restored.';
        await this.prisma.user.update({
            where: { id: userId },
            data: { walletFrozen: frozen, walletNote: note },
        });
        const idempotencyKey = `staff:${action}:${userId}:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await this.prisma.walletLedger.create({
            data: {
                userId,
                delta: 0,
                balanceAfter: user.coins,
                reason: frozen ? 'staff:freeze' : 'staff:unfreeze',
                idempotencyKey,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: `wallets.${action}`,
                entity: 'user',
                afterJson: { userId, walletFrozen: frozen },
            },
        });
        const wallets = await this.adminListWallets();
        return { wallet: wallets.wallets.find((w) => w.id === userId) };
    }
};
exports.WalletsService = WalletsService;
exports.WalletsService = WalletsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        settings_service_1.SettingsService])
], WalletsService);
//# sourceMappingURL=wallets.service.js.map