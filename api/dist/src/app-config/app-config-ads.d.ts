export type AdPlacementConfig = {
    enabled: boolean;
    cooldownHours: number;
    incompleteMessage: string;
    buttonLabel: string;
};
export type AdsConfigBundle = {
    calculate: AdPlacementConfig;
    dpi: AdPlacementConfig;
    quiz: AdPlacementConfig;
    secondChance: AdPlacementConfig;
    adBonus: AdPlacementConfig;
    checkIn: AdPlacementConfig;
    redeemDaily: AdPlacementConfig;
};
export declare const DEFAULT_ADS_CONFIG: AdsConfigBundle;
export declare function normalizeAdsConfig(raw: unknown): AdsConfigBundle;
export declare function assertAdsConfigForSave(raw: unknown): AdsConfigBundle;
