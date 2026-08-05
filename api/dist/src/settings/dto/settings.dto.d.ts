export declare class PreferencesDto {
    defaultLanding: string;
    compactTables: boolean;
    showInlineNotices: boolean;
    denseSidebar: boolean;
    timezoneLabel: string;
}
export declare class SessionDto {
    idleTimeoutMinutes: number;
    absoluteSessionHours: number;
    rememberDeviceDays: number;
    logoutOnBrowserClose: boolean;
    singleSessionOnly: boolean;
}
export declare class SecurityDto {
    requireReauthForReveal: boolean;
    requireReauthForStaffInvite: boolean;
    requireReauthForWalletAdjust: boolean;
    allowViewerCsvExport: boolean;
    ipAllowlistNote: string;
    auditRetentionDays: number;
    auditAutoPurge: boolean;
    lastAuditPurgeAt?: string | null;
}
export declare class SaveOpsSettingsDto {
    preferences: PreferencesDto;
    session: SessionDto;
    security: SecurityDto;
}
