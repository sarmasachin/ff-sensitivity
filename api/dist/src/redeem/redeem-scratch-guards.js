"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertScratchCardOpen = assertScratchCardOpen;
exports.assertRedeemSeat = assertRedeemSeat;
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
function assertScratchCardOpen(code, now) {
    if (code.status === client_1.RedeemCodeStatus.PAUSED) {
        throw new app_error_1.AppError('REDEEM_PAUSED', 'This scratch card is paused right now.', 409);
    }
    if (code.status === client_1.RedeemCodeStatus.EXPIRED ||
        (code.expiresAt != null && code.expiresAt.getTime() <= now.getTime())) {
        throw new app_error_1.AppError('REDEEM_EXPIRED', 'This scratch card has ended.', 409);
    }
    if (code.status !== client_1.RedeemCodeStatus.ACTIVE) {
        throw new app_error_1.AppError('REDEEM_UNAVAILABLE', 'This scratch card is not available.', 409);
    }
    const start = code.startsAt ?? code.createdAt;
    if (now.getTime() < start.getTime()) {
        throw new app_error_1.AppError('REDEEM_NOT_STARTED', 'This scratch card has not started yet.', 409);
    }
    if (code.endsAt != null && now.getTime() > code.endsAt.getTime()) {
        throw new app_error_1.AppError('REDEEM_SCHEDULE_ENDED', 'This scratch schedule has ended.', 409);
    }
}
async function assertRedeemSeat(prisma, userId) {
    const seat = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true, isRestricted: true },
    });
    if (!seat || !seat.isActive) {
        throw new app_error_1.AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
    }
    if (seat.isRestricted) {
        throw new app_error_1.AppError('USER_RESTRICTED', 'Redeem is paused while this account is restricted.', 403);
    }
}
//# sourceMappingURL=redeem-scratch-guards.js.map