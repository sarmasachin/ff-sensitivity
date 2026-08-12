import type { AuthAdmin } from '../auth/current-admin.decorator';
import { ShopAdminService } from './shop-admin.service';
import { CreateShopCategoryDto, CreateShopItemDto, UpdateShopCategoryDto, UpdateShopItemDto } from './dto/shop-admin.dto';
export declare class ShopAdminController {
    private readonly shop;
    constructor(shop: ShopAdminService);
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
    createCategory(admin: AuthAdmin, dto: CreateShopCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
        isBoost: boolean;
    }>;
    updateCategory(admin: AuthAdmin, id: string, dto: UpdateShopCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
        isBoost: boolean;
    }>;
    removeCategory(admin: AuthAdmin, id: string): Promise<{
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
    create(admin: AuthAdmin, dto: CreateShopItemDto): Promise<{
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
    update(admin: AuthAdmin, id: string, dto: UpdateShopItemDto): Promise<{
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
    remove(admin: AuthAdmin, id: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    private assertCanMutate;
}
