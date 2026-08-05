import type { AuthAdmin } from '../auth/current-admin.decorator';
import { PromosService } from './promos.service';
import { SavePromosDto } from './dto/promos.dto';
export declare class PromosAdminController {
    private readonly promos;
    constructor(promos: PromosService);
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
}
