import { PrismaService } from '../prisma/prisma.service';
import { ShopAdminService } from '../shop/shop-admin.service';
import { EconomyEarnService } from './economy-earn.service';
import { type PremiumUnlockProduct } from './premium-unlock-prices';
export declare class EconomyService {
    private readonly prisma;
    private readonly shop;
    private readonly earn;
    constructor(prisma: PrismaService, shop: ShopAdminService, earn: EconomyEarnService);
    getWallet(userId: string): Promise<{
        coins: number;
        frozen: boolean;
        boosts: {
            [k: string]: number;
        };
        ownedShopIds: string[];
        shopBuyCounts: Record<string, number>;
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
    earnChallenge(userId: string, kind: 'CHECKIN' | 'QUIZ' | 'AD' | 'MILESTONE', opts: {
        correct?: boolean;
        milestoneDays?: number;
    }): Promise<{
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    purchaseShop(userId: string, itemId: string, requestId: string): Promise<{
        coins: number;
        itemId: string;
        alreadyApplied: boolean;
    }>;
    getPremiumUnlockPrices(): Promise<{
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
    spendPremiumUnlock(userId: string, productRaw: string, requestId: string): Promise<{
        coins: number;
        product: PremiumUnlockProduct;
        cost: number;
        alreadyApplied: boolean;
        label: string;
    }>;
    earnQuizGraded(userId: string, correct: boolean, amounts: {
        correctCoins: number;
        wrongCoins: number;
    }): Promise<{
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    earnScratchCoins(userId: string, day: string, slot: number, amount: number): Promise<{
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    requireUserPublic(userId: string): Promise<{
        id: string;
        email: string;
        isActive: boolean;
        lastLoginAt: Date | null;
        displayName: string;
        createdAt: Date;
        updatedAt: Date;
        googleSub: string;
        photoUrl: string | null;
        coins: number;
        streakDays: number;
        lastCheckinDay: string | null;
        walletFrozen: boolean;
        walletNote: string;
        isRestricted: boolean;
        accountNote: string;
        googleName: string;
        ffUid: string;
        playRole: string;
        region: string;
        notifyPush: boolean;
        tokenVersion: number;
        dataDeletedAt: Date | null;
        googleBanned: boolean;
    }>;
    private requireUser;
    private assertNotFrozen;
}
