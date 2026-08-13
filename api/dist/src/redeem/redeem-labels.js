"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.relativeRedeemLabel = relativeRedeemLabel;
function relativeRedeemLabel(date) {
    const ms = Date.now() - date.getTime();
    const min = Math.floor(ms / 60_000);
    if (min < 1)
        return 'just now';
    if (min < 60)
        return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24)
        return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7)
        return `${days} day${days === 1 ? '' : 's'} ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}
//# sourceMappingURL=redeem-labels.js.map