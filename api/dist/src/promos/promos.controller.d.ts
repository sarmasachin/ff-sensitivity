import { PromosService } from './promos.service';
export declare class PromosController {
    private readonly promos;
    constructor(promos: PromosService);
    live(): Promise<{
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
