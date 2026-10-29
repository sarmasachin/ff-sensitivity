import type { PrismaService } from '../prisma/prisma.service';
import { STALE_HOURS } from './devices-security';

export type DeviceDeskStats = {
  total: number;
  active: number;
  stale: number;
  blocked: number;
  withToken: number;
};

function num(v: bigint | number | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Full registry cards. Same 72h rule as computeDeviceStatus. */
export async function countDeviceDeskStats(
  prisma: PrismaService,
  now = new Date(),
): Promise<DeviceDeskStats> {
  const staleBefore = new Date(now.getTime() - STALE_HOURS * 3_600_000);
  const [row] = await prisma.$queryRaw<
    Array<{
      total: bigint;
      blocked: bigint;
      active: bigint;
      stale: bigint;
      with_token: bigint;
    }>
  >`
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
