"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskRedeemCode = maskRedeemCode;
function maskRedeemCode(secret) {
    const clean = secret.trim();
    if (clean.length <= 8)
        return '••••••••';
    const parts = clean.split('-');
    if (parts.length >= 4) {
        return `${parts[0]}-••••-••••-${parts[parts.length - 1]}`;
    }
    return `${clean.slice(0, 4)}-••••-••••-${clean.slice(-4)}`;
}
//# sourceMappingURL=redeem-mask.js.map