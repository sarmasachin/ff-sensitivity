"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countDeviceDeskStats = countDeviceDeskStats;
const devices_security_1 = require("./devices-security");
function num(v) {
    if (v == null)
        return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
async function countDeviceDeskStats(prisma, now = new Date()) {
    const staleBefore = new Date(now.getTime() - devices_security_1.STALE_HOURS * 3_600_000);
    const [row] = await prisma.$queryRaw `
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE blocked)::bigint AS blocked,
      COUNT(*) FILTER (
        WHERE NOT blocked AND last_seen_at >= ${staleBefore}
      )::bigint AS active,
      COUNT(*) FILTER (
        WHERE NOT blocked AND last_seen_at < ${staleBefore}
      )::bigint AS stale,
      COUNT(*) FILTER (WHERE has_fcm_token)::bigint AS with_token
    FROM device_installs
  `;
    return {
        total: num(row?.total),
        active: num(row?.active),
        stale: num(row?.stale),
        blocked: num(row?.blocked),
        withToken: num(row?.with_token),
    };
}
//# sourceMappingURL=devices-desk.js.map