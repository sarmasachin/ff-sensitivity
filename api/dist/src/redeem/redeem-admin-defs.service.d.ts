import { PrismaService } from '../prisma/prisma.service';
import type { CreateRedeemCadenceDto, CreateRedeemTypeDto, UpdateRedeemCadenceDto, UpdateRedeemTypeDto } from './dto/redeem-admin.dto';
export declare class RedeemAdminDefsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listTypes(): Promise<{
        types: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            sortOrder: number;
            enabled: boolean;
        }[];
    }>;
    listCadences(): Promise<{
        cadences: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            sortOrder: number;
            enabled: boolean;
            claimLimit: number;
            windowHours: number;
        }[];
    }>;
    requireType(raw: string, opts?: {
        mustBeEnabled?: boolean;
    }): Promise<string>;
    requireCadence(raw: string, opts?: {
        mustBeEnabled?: boolean;
    }): Promise<string>;
    createType(adminId: string, dto: CreateRedeemTypeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
    }>;
    updateType(adminId: string, idRaw: string, dto: UpdateRedeemTypeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
    }>;
    removeType(adminId: string, idRaw: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    createCadence(adminId: string, dto: CreateRedeemCadenceDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
        claimLimit: number;
        windowHours: number;
    }>;
    updateCadence(adminId: string, idRaw: string, dto: UpdateRedeemCadenceDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
        claimLimit: number;
        windowHours: number;
    }>;
    removeCadence(adminId: string, idRaw: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    private audit;
}
