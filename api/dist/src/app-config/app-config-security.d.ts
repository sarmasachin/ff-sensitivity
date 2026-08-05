export declare const APP_FEATURE_KEYS: readonly ["redeem", "shop", "challenge", "scratch", "share", "names", "community", "support"];
export declare const APP_NAV_KEYS: readonly ["homeRedeem", "homeShop", "homeChallenge", "homeScratch", "homeNames", "homeShare", "navCommunity", "navSupport", "navAbout"];
export declare function sanitizeText(raw: string, max: number): string;
export declare function assertSafeText(text: string, field: string): void;
export declare function assertSafeHttpsUrl(raw: string, field: string): string;
export declare function normalizeBoolMap(raw: Record<string, unknown> | null | undefined, keys: readonly string[], fallbackTrue?: boolean): Record<string, boolean>;
export declare const DEFAULT_APP_CONFIG: {
    status: {
        maintenanceMode: boolean;
        maintenanceMessage: string;
        forceUpdate: boolean;
        softUpdatePrompt: boolean;
        minVersionCode: number;
        minVersionName: string;
    };
    features: Record<string, boolean>;
    navigation: Record<string, boolean>;
    links: {
        playStoreUrl: string;
        privacyUrl: string;
        websiteUrl: string;
        supportEmail: string;
    };
};
