import { PrismaService } from '../prisma/prisma.service';
import type { CreateShopCategoryDto, CreateShopItemDto, UpdateShopCategoryDto, UpdateShopItemDto } from './dto/shop-admin.dto';
export declare class ShopAdminService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listCategories(): Promise<{
        categories: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            sortOrder: number;
            enabled: boolean;
            isBoost: boolean;
        }[];
    }>;
    createCategory(adminId: string, dto: CreateShopCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
        isBoost: boolean;
    }>;
    updateCategory(adminId: string, idRaw: string, dto: UpdateShopCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
        isBoost: boolean;
    }>;
    removeCategory(adminId: string, idRaw: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    list(): Promise<{
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
            rewardTag: string;
            sortOrder: number;
        }[];
        categories: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            sortOrder: number;
            enabled: boolean;
            isBoost: boolean;
        }[];
    }>;
    appCatalog(): Promise<{
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
            rewardTag: string;
        }[];
    }>;
    findPurchaseItem(itemId: string): Promise<{
        id: string;
        priceCoins: number;
        oneTime: boolean;
        stockLimit: number | null;
        enabled: true;
        isBoost: boolean;
    } | null>;
    listPurchaseCatalog(): Promise<{
        id: string;
        priceCoins: number;
        oneTime: boolean;
        stockLimit: number | null;
        enabled: boolean;
        isBoost: boolean;
    }[]>;
    create(adminId: string, dto: CreateShopItemDto): Promise<{
        id: string;
        title: string;
        subtitle: string;
        category: string;
        categoryLabel: string;
        priceCoins: number;
        enabled: boolean;
        oneTime: boolean;
        stockLimit: number | null;
        rewardTag: string;
        sortOrder: number;
    }>;
    update(adminId: string, idRaw: string, dto: UpdateShopItemDto): Promise<{
        id: string;
        title: string;
        subtitle: string;
        category: string;
        categoryLabel: string;
        priceCoins: number;
        enabled: boolean;
        oneTime: boolean;
        stockLimit: number | null;
        rewardTag: string;
        sortOrder: number;
    }>;
    remove(adminId: string, idRaw: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    private requireCategory;
    private parseWrite;
    private toListRow;
    private audit;
}
