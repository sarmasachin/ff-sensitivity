import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
export type ShopPurchaseSnapshot = {
    oneTime: boolean;
    title: string;
    category: string;
    deviceId: string;
    deviceLabel: string;
};
export declare function deviceLabelFrom(model?: string | null, brand?: string | null): string;
export declare function buildShopSnapshot(snap: ShopPurchaseSnapshot): Prisma.InputJsonValue;
export type ShopPurchaseRow = {
    id: string;
    userId: string;
    email: string;
    googleName: string;
    displayName: string;
    deviceId: string;
    deviceLabel: string;
    itemId: string;
    itemTitle: string;
    category: string;
    oneTime: boolean;
    coins: number;
    balanceAfter: number;
    createdAt: string;
};
export declare function listShopPurchases(prisma: PrismaService): Promise<{
    purchases: ShopPurchaseRow[];
}>;
