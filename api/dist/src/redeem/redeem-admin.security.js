"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRedeemText = sanitizeRedeemText;
exports.assertRedeemAdminId = assertRedeemAdminId;
exports.assertRedeemDefId = assertRedeemDefId;
exports.assertRedeemType = assertRedeemType;
exports.assertRedeemCadence = assertRedeemCadence;
exports.assertRedeemStatus = assertRedeemStatus;
exports.assertStockLeft = assertStockLeft;
exports.assertCodeSecret = assertCodeSecret;
exports.assertSortOrder = assertSortOrder;
exports.assertClaimLimit = assertClaimLimit;
exports.assertWindowHours = assertWindowHours;
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const STATUSES = new Set(Object.values(client_1.RedeemCodeStatus));
const DEF_ID_RE = /^[A-Z][A-Z0-9_]{1,31}$/;
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
function assertRedeemDefId(raw) {
    const id = String(raw ?? '')
        .trim()
        .toUpperCase();
    if (!DEF_ID_RE.test(id)) {
        throw new app_error_1.AppError('REDEEM_BAD_DEF_ID', 'Id must be UPPER_SNAKE (2–32), e.g. GOOGLE_PLAY or DAILY.', 400);
    }
    return id;
}
function assertRedeemType(raw) {
    return assertRedeemDefId(raw);
}
function assertRedeemCadence(raw) {
    return assertRedeemDefId(raw);
}
function assertRedeemStatus(raw) {
    if (!STATUSES.has(raw)) {
        throw new app_error_1.AppError('REDEEM_BAD_STATUS', 'Invalid redeem status.', 400);
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
function assertSortOrder(n, fallback = 0) {
    if (n == null || n === '')
        return fallback;
    const v = Number(n);
    if (!Number.isInteger(v) || v < 0 || v > 9999) {
        throw new app_error_1.AppError('REDEEM_BAD_SORT', 'Sort order must be 0–9999.', 400);
    }
    return v;
}
function assertClaimLimit(n, fallback = 3) {
    if (n == null || n === '')
        return fallback;
    const v = Number(n);
    if (!Number.isInteger(v) || v < 1 || v > 100) {
        throw new app_error_1.AppError('REDEEM_BAD_CLAIM_LIMIT', 'Claim limit must be 1–100.', 400);
    }
    return v;
}
function assertWindowHours(n, fallback = 24) {
    if (n == null || n === '')
        return fallback;
    const v = Number(n);
    if (!Number.isInteger(v) || v < 1 || v > 8760) {
        throw new app_error_1.AppError('REDEEM_BAD_WINDOW_HOURS', 'Window hours must be 1–8760.', 400);
    }
    return v;
}
//# sourceMappingURL=redeem-admin.security.js.map