import { STALE_HOURS } from '../devices/devices-security';
export { STALE_HOURS };
export declare const LOW_STOCK_MAX = 10;
export declare const PUSH_ACTIVE_DAYS = 7;
export declare function startOfUtcDay(now?: Date): Date;
export declare function daysAgoUtc(days: number, now?: Date): Date;
export declare function hoursAgoCutoff(hours: number, now?: Date): Date;
