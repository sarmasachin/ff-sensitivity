export declare class AdPlacementDto {
    enabled: boolean;
    cooldownHours: number;
    incompleteMessage: string;
    buttonLabel: string;
}
export declare class SaveAdsConfigDto {
    calculate: AdPlacementDto;
    dpi: AdPlacementDto;
    quiz: AdPlacementDto;
    secondChance: AdPlacementDto;
    adBonus: AdPlacementDto;
    checkIn: AdPlacementDto;
    redeemDaily: AdPlacementDto;
}
