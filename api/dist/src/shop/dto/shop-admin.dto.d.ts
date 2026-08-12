export declare class CreateShopCategoryDto {
    id: string;
    label: string;
    sortOrder?: number;
    enabled?: boolean;
    isBoost?: boolean;
}
export declare class UpdateShopCategoryDto {
    label?: string;
    sortOrder?: number;
    enabled?: boolean;
    isBoost?: boolean;
}
export declare class CreateShopItemDto {
    id: string;
    title: string;
    subtitle: string;
    category: string;
    priceCoins: number;
    enabled: boolean;
    oneTime: boolean;
    stockLimit?: number | null;
    rewardTag: string;
    sortOrder?: number;
}
export declare class UpdateShopItemDto {
    title?: string;
    subtitle?: string;
    category?: string;
    priceCoins?: number;
    enabled?: boolean;
    oneTime?: boolean;
    stockLimit?: number | null;
    rewardTag?: string;
    sortOrder?: number;
}
