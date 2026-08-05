export declare const ALLOWED_LANDINGS: readonly ["/dashboard", "/dash", "/redeem", "/claims", "/support", "/audit"];
export type OpsSettingsBundle = {
    preferences: {
        defaultLanding: string;
        compactTables: boolean;
        showInlineNotices: boolean;
        denseSidebar: boolean;
        timezoneLabel: string;
    };
    session: {
        idleTimeoutMinutes: number;
        absoluteSessionHours: number;
        rememberDeviceDays: number;
        logoutOnBrowserClose: boolean;
        singleSessionOnly: boolean;
    };
    security: {
        requireReauthForReveal: boolean;
        requireReauthForStaffInvite: boolean;
        requireReauthForWalletAdjust: boolean;
        allowViewerCsvExport: boolean;
        ipAllowlistNote: string;
        auditRetentionDays: number;
        auditAutoPurge: boolean;
        lastAuditPurgeAt: string | null;
    };
};
export declare const DEFAULT_OPS_SETTINGS: OpsSettingsBundle;
export declare function sanitizeSettingsText(raw: string, max: number): string;
export declare function assertSafeSettingsText(text: string, field: string): void;
export declare function assertLanding(raw: string): string;
export declare function normalizeSettingsPayload(raw: unknown): OpsSettingsBundle;
export declare function mergeSettingsJson(prefsRaw: unknown, sessionRaw: unknown, securityRaw: unknown): OpsSettingsBundle;
