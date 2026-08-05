export declare const PROMO_PLACEMENTS: readonly ["HOME_BANNER", "HOME_STRIP"];
export declare class PromoDto {
    id: string;
    title: string;
    subtitle: string;
    imageLabel: string;
    deepLink: string;
    placement: (typeof PROMO_PLACEMENTS)[number];
    sortOrder: number;
    enabled: boolean;
    startsAt: string;
    endsAt: string;
}
export declare class SavePromosDto {
    promos: PromoDto[];
}
