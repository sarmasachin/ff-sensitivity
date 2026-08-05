import { STALE_HOURS } from '../devices/devices-security';

// --- Start: Overview KPIs live wire (Sachin) ---
export { STALE_HOURS };

/** ACTIVE redeem codes at or below this stock count as low-stock alerts. */
export const LOW_STOCK_MAX = 10;

export const PUSH_ACTIVE_DAYS = 7;

export function startOfUtcDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function daysAgoUtc(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function hoursAgoCutoff(hours: number, now = new Date()): Date {
  return new Date(now.getTime() - hours * 3_600_000);
}
// --- End: Overview KPIs live wire (Sachin) ---
