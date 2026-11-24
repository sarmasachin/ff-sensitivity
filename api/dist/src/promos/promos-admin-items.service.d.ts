import { PrismaService } from '../prisma/prisma.service';
import type { PromoDto } from './dto/promos.dto';
export declare class PromosAdminItemsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(adminId: string, dto: PromoDto): Promise<{
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
    update(adminId: string, rawId: string, dto: PromoDto): Promise<{
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
    remove(adminId: string, rawId: string): Promise<{
        ok: true;
        id: string;
        deleted: number;
    }>;
    reorder(adminId: string, ids: string[]): Promise<{
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
}
