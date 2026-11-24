import type { AuthUser } from '../user-auth/current-user.decorator';
import { EconomyService } from './economy.service';
import { ChallengeEarnDto, PremiumUnlockDto, ShopPurchaseDto } from './dto/economy.dto';
export declare class EconomyController {
    private readonly economy;
    constructor(economy: EconomyService);
    wallet(user: AuthUser): Promise<{
        coins: number;
        frozen: boolean;
        boosts: {
            [k: string]: number;
        };
        ownedShopIds: string[];
        shopBuyCounts: Record<string, number>;
    }>;
    earn(user: AuthUser, dto: ChallengeEarnDto): Promise<{
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    purchase(user: AuthUser, dto: ShopPurchaseDto): Promise<{
        coins: number;
        itemId: string;
        alreadyApplied: boolean;
    }>;
    premiumUnlockPrices(): Promise<{
        best_premium: number;
        premium_pro_max: number;
        one_tap_premium: number;
        coinUnlockEnabled: boolean;
        adUnlockEnabled: boolean;
        labels: {
            best_premium: string;
            premium_pro_max: string;
            one_tap_premium: string;
        };
    }>;
    premiumUnlock(user: AuthUser, dto: PremiumUnlockDto): Promise<{
        coins: number;
        product: import("./premium-unlock-prices").PremiumUnlockProduct;
        cost: number;
        alreadyApplied: boolean;
        label: string;
    }>;
    shopCatalog(): Promise<{
        categories: {
            id: string;
            label: string;
            isBoost: boolean;
        }[];
        items: {
            id: string;
            title: string;
            subtitle: string;
            category: string;
            categoryLabel: string;
            priceCoins: number;
            enabled: boolean;
            oneTime: boolean;
            stockLimit: number | null;
            stockSold: number;
            rewardTag: string;
        }[];
    }>;
}
