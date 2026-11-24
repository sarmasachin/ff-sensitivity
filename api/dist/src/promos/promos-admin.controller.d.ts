import type { AuthAdmin } from '../auth/current-admin.decorator';
import { PromosAdminItemsService } from './promos-admin-items.service';
import { PromosService } from './promos.service';
import { PromoDto, ReorderPromosDto, SavePromosDto } from './dto/promos.dto';
export declare class PromosAdminController {
    private readonly promos;
    private readonly items;
    constructor(promos: PromosService, items: PromosAdminItemsService);
    list(): Promise<{
        promos: {
            id: string;
            title: string;
            subtitle: string;
            imageLabel: string;
            deepLink: string;
            placement: import(".prisma/client").$Enums.PromoPlacement;
            sortOrder: number;
            enabled: boolean;
            startsAt: string;
            endsAt: string;
            updatedAt: string;
        }[];
    }>;
    save(admin: AuthAdmin, dto: SavePromosDto): Promise<{
        promos: {
            id: string;
            title: string;
            subtitle: string;
            imageLabel: string;
            deepLink: string;
            placement: import(".prisma/client").$Enums.PromoPlacement;
            sortOrder: number;
            enabled: boolean;
            startsAt: string;
            endsAt: string;
            updatedAt: string;
        }[];
    }>;
    create(admin: AuthAdmin, dto: PromoDto): Promise<{
        id: string;
        title: string;
        subtitle: string;
        imageLabel: string;
        deepLink: string;
        placement: import(".prisma/client").$Enums.PromoPlacement;
        sortOrder: number;
        enabled: boolean;
        startsAt: string;
        endsAt: string;
        updatedAt: string;
    }>;
    reorder(admin: AuthAdmin, dto: ReorderPromosDto): Promise<{
        promos: {
            id: string;
            title: string;
            subtitle: string;
            imageLabel: string;
            deepLink: string;
            placement: import(".prisma/client").$Enums.PromoPlacement;
            sortOrder: number;
            enabled: boolean;
            startsAt: string;
            endsAt: string;
            updatedAt: string;
        }[];
    }>;
    update(admin: AuthAdmin, id: string, dto: PromoDto): Promise<{
        id: string;
        title: string;
        subtitle: string;
        imageLabel: string;
        deepLink: string;
        placement: import(".prisma/client").$Enums.PromoPlacement;
        sortOrder: number;
        enabled: boolean;
        startsAt: string;
        endsAt: string;
        updatedAt: string;
    }>;
    remove(admin: AuthAdmin, id: string): Promise<{
        ok: true;
        id: string;
        deleted: number;
    }>;
}
