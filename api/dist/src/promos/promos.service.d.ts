import { PrismaService } from '../prisma/prisma.service';
import type { SavePromosDto } from './dto/promos.dto';
export declare class PromosService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private toRow;
    adminList(): Promise<{
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
    adminSave(adminId: string, dto: SavePromosDto): Promise<{
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
    liveCatalog(): Promise<{
        promos: {
            id: string;
            title: string;
            subtitle: string;
            imageLabel: string;
            deepLink: string;
            placement: import(".prisma/client").$Enums.PromoPlacement;
            sortOrder: number;
        }[];
    }>;
}
