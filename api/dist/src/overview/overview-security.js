"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUSH_ACTIVE_DAYS = exports.LOW_STOCK_MAX = exports.STALE_HOURS = void 0;
exports.startOfUtcDay = startOfUtcDay;
exports.daysAgoUtc = daysAgoUtc;
exports.hoursAgoCutoff = hoursAgoCutoff;
const devices_security_1 = require("../devices/devices-security");
Object.defineProperty(exports, "STALE_HOURS", { enumerable: true, get: function () { return devices_security_1.STALE_HOURS; } });
exports.LOW_STOCK_MAX = 10;
exports.PUSH_ACTIVE_DAYS = 7;
function startOfUtcDay(now = new Date()) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function daysAgoUtc(days, now = new Date()) {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
function hoursAgoCutoff(hours, now = new Date()) {
    return new Date(now.getTime() - hours * 3_600_000);
}
//# sourceMappingURL=overview-security.js.map