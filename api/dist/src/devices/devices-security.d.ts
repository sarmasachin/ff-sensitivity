export declare const STALE_HOURS = 72;
export declare function sanitizeDeviceText(raw: string, max: number): string;
export declare function assertSafeDeviceText(text: string, field: string): void;
export declare function assertInstallId(raw: string): string;
export declare function maskFcmToken(token: string): string;
export declare function tokenHintFromFull(token: string): string;
export declare function hoursAgo(from: Date, now?: Date): number;
export declare function formatLastSeen(hours: number): string;
export declare function computeDeviceStatus(opts: {
    blocked: boolean;
    lastSeenAt: Date;
    now?: Date;
}): 'ACTIVE' | 'STALE' | 'BLOCKED';
