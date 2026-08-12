"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertShopItemId = assertShopItemId;
exports.assertCategoryId = assertCategoryId;
exports.sanitizeShopText = sanitizeShopText;
exports.assertPriceCoins = assertPriceCoins;
exports.assertStockLimit = assertStockLimit;
exports.assertSortOrder = assertSortOrder;
const app_error_1 = require("../common/errors/app-error");
const ID_RE = /^[a-z0-9_]{2,64}$/;
const CAT_RE = /^[A-Z][A-Z0-9_]{1,31}$/;
function assertShopItemId(raw) {
    const id = String(raw ?? '')
        .trim()
        .toLowerCase();
    if (!ID_RE.test(id)) {
        throw new app_error_1.AppError('SHOP_BAD_ID', 'ID must use lowercase letters, numbers, and underscores (2–64).', 400);
    }
    return id;
}
function assertCategoryId(raw) {
    const id = String(raw ?? '')
        .trim()
        .toUpperCase();
    if (!CAT_RE.test(id)) {
        throw new app_error_1.AppError('SHOP_BAD_CATEGORY', 'Category id must be UPPER_SNAKE (2–32), e.g. PRIZE or SPECIAL.', 400);
    }
    return id;
}
function sanitizeShopText(raw, max) {
    const text = String(raw ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length > max) {
        throw new app_error_1.AppError('SHOP_BAD_TEXT', `Text must be at most ${max} characters.`, 400);
    }
    return text;
}
function assertPriceCoins(raw) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 999999) {
        throw new app_error_1.AppError('SHOP_BAD_PRICE', 'Price must be a whole number from 1 to 999999.', 400);
    }
    return n;
}
function assertStockLimit(raw) {
    if (raw === null || raw === undefined || raw === '')
        return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 999999) {
        throw new app_error_1.AppError('SHOP_BAD_STOCK', 'Stock limit must be empty (unlimited) or 0–999999.', 400);
    }
    return n;
}
function assertSortOrder(raw, fallback = 0) {
    if (raw === null || raw === undefined || raw === '')
        return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 9999) {
        throw new app_error_1.AppError('SHOP_BAD_SORT', 'Sort order must be 0–9999.', 400);
    }
    return n;
}
//# sourceMappingURL=shop-admin.security.js.map