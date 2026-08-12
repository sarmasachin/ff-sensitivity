export declare function assertShopItemId(raw: string): string;
export declare function assertCategoryId(raw: unknown): string;
export declare function sanitizeShopText(raw: unknown, max: number): string;
export declare function assertPriceCoins(raw: unknown): number;
export declare function assertStockLimit(raw: unknown): number | null;
export declare function assertSortOrder(raw: unknown, fallback?: number): number;
