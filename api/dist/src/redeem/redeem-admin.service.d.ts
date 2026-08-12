import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import type { CreateRedeemCodeDto, UpdateRedeemCodeDto } from './dto/redeem-admin.dto';
export declare class RedeemAdminService {
    private readonly prisma;
    private readonly settings;
    constructor(prisma: PrismaService, settings: SettingsService);
    list(): Promise<{
        codes: {
            id: string;
            title: string;
            type: string;
            valueLabel: string;
            codeSecret: string;
            codeMasked: string;
            status: string;
            cadence: string;
            stockLeft: number;
            coinCost: number | null;
            expiresLabel: string;
            tip: string;
            redeemUrl: string;
        }[];
    }>;
    create(adminId: string, dto: CreateRedeemCodeDto): Promise<{
        id: string;
        title: string;
        type: string;
        valueLabel: string;
        codeSecret: string;
        codeMasked: string;
        status: string;
        cadence: string;
        stockLeft: number;
        coinCost: number | null;
        expiresLabel: string;
        tip: string;
        redeemUrl: string;
    }>;
    update(adminId: string, id: string, dto: UpdateRedeemCodeDto): Promise<{
        id: string;
        title: string;
        type: string;
        valueLabel: string;
        codeSecret: string;
        codeMasked: string;
        status: string;
        cadence: string;
        stockLeft: number;
        coinCost: number | null;
        expiresLabel: string;
        tip: string;
        redeemUrl: string;
    }>;
    remove(adminId: string, id: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    reveal(adminId: string, id: string, currentPassword?: string): Promise<{
        id: string;
        title: string;
        codeMasked: string;
        code: string;
    }>;
    private parseWrite;
    private toListRow;
    private rethrowUnique;
    private audit;
}
