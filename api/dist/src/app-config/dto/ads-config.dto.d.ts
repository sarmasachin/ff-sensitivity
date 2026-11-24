export declare class AdPlacementDto {
    enabled: boolean;
    cooldownMinutes?: number;
    cooldownHours?: number;
    incompleteMessage: string;
    buttonLabel: string;
}
export declare class SaveAdsConfigDto {
    calculate: AdPlacementDto;
    premium: AdPlacementDto;
    dpi: AdPlacementDto;
    quiz: AdPlacementDto;
    secondChance: AdPlacementDto;
    adBonus: AdPlacementDto;
    checkIn: AdPlacementDto;
    redeemDaily: AdPlacementDto;
}
