export declare const MAX_AD_COOLDOWN_MINUTES: number;
export type AdPlacementConfig = {
    enabled: boolean;
    cooldownMinutes: number;
    cooldownHours: number;
    incompleteMessage: string;
    buttonLabel: string;
};
export type AdsConfigBundle = {
    calculate: AdPlacementConfig;
    premium: AdPlacementConfig;
    dpi: AdPlacementConfig;
    quiz: AdPlacementConfig;
    secondChance: AdPlacementConfig;
    adBonus: AdPlacementConfig;
    checkIn: AdPlacementConfig;
    redeemDaily: AdPlacementConfig;
};
export declare function clampAdCooldownMinutes(raw: unknown, fallback: number): number;
export declare function legacyHoursFromMinutes(minutes: number): number;
export declare const DEFAULT_ADS_CONFIG: AdsConfigBundle;
export declare function normalizeAdsConfig(raw: unknown): AdsConfigBundle;
export declare function assertAdsConfigForSave(raw: unknown): AdsConfigBundle;
