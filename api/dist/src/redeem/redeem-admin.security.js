"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRedeemText = sanitizeRedeemText;
exports.assertRedeemAdminId = assertRedeemAdminId;
exports.assertRedeemType = assertRedeemType;
exports.assertRedeemStatus = assertRedeemStatus;
exports.assertRedeemCadence = assertRedeemCadence;
exports.assertStockLeft = assertStockLeft;
exports.assertCodeSecret = assertCodeSecret;
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const TYPES = new Set(Object.values(client_1.RedeemType));
const STATUSES = new Set(Object.values(client_1.RedeemCodeStatus));
const CADENCES = new Set(Object.values(client_1.RedeemCadence));
function sanitizeRedeemText(raw, max) {
    return [...(raw ?? '')]
        .filter((ch) => {
        const code = ch.codePointAt(0) ?? 0;
        if (code < 0x20 || code === 0x7f)
            return false;
        if (code >= 0x200b && code <= 0x200f)
            return false;
        return true;
    })
        .join('')
        .trim()
        .slice(0, max);
}
function assertRedeemAdminId(raw) {
    const id = (raw ?? '').trim();
    if (id.length < 10 || id.length > 40 || !/^[a-z0-9_-]+$/i.test(id)) {
        throw new app_error_1.AppError('REDEEM_INVALID_ID', 'Invalid redeem code id.', 400);
    }
    return id;
}
function assertRedeemType(raw) {
    if (!TYPES.has(raw)) {
        throw new app_error_1.AppError('REDEEM_BAD_TYPE', 'Invalid redeem type.', 400);
    }
    return raw;
}
function assertRedeemStatus(raw) {
    if (!STATUSES.has(raw)) {
        throw new app_error_1.AppError('REDEEM_BAD_STATUS', 'Invalid redeem status.', 400);
    }
    return raw;
}
function assertRedeemCadence(raw) {
    if (!CADENCES.has(raw)) {
        throw new app_error_1.AppError('REDEEM_BAD_CADENCE', 'Invalid cadence.', 400);
    }
    return raw;
}
function assertStockLeft(n) {
    if (!Number.isInteger(n) || (n !== 0 && n !== 1)) {
        throw new app_error_1.AppError('REDEEM_STOCK_INVALID', 'Stock must be 0 or 1 (one secret per row).', 400);
    }
    return n;
}
function assertCodeSecret(raw) {
    const secret = sanitizeRedeemText(raw, 80).toUpperCase();
    if (secret.length < 8) {
        throw new app_error_1.AppError('REDEEM_BAD_SECRET', 'Code must be at least 8 characters.', 400);
    }
    return secret;
}
//# sourceMappingURL=redeem-admin.security.js.map