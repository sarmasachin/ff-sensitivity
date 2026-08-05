export declare function sanitizeUserText(raw: string, max: number): string;
export declare function assertSafeUserText(text: string, field: string): void;
export declare function assertUserId(raw: string): string;
export declare function maskEmail(email: string): string;
export declare function maskGoogleSub(googleSub: string): string;
export declare function hoursAgo(from: Date, now?: Date): number;
export declare function formatWhen(hours: number): string;
export declare function formatJoined(d: Date): string;
export declare function mapAccountStatus(isActive: boolean, isRestricted: boolean): 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED';
