import type { AuthAdmin } from '../auth/current-admin.decorator';
import { RedeemAdminService } from './redeem-admin.service';
import { RedeemAdminDefsService } from './redeem-admin-defs.service';
import { AppendRedeemPoolDto, CreateRedeemCadenceDto, CreateRedeemCodeDto, CreateRedeemTypeDto, RevealRedeemCodeDto, UpdateRedeemCadenceDto, UpdateRedeemCodeDto, UpdateRedeemTypeDto } from './dto/redeem-admin.dto';
export declare class RedeemAdminController {
    private readonly redeem;
    private readonly defs;
    constructor(redeem: RedeemAdminService, defs: RedeemAdminDefsService);
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
            mode: string;
            stockLeft: number;
            poolLeft: number | null;
            coinCost: number | null;
            coinRewardMin: number | null;
            coinRewardMax: number | null;
            startsAt: string | null;
            endsAt: string | null;
            windowMinutes: number;
            codesPerWindow: number;
            expiresLabel: string;
            tip: string;
            redeemUrl: string;
        }[];
        types: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            sortOrder: number;
            enabled: boolean;
        }[];
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
    createType(admin: AuthAdmin, dto: CreateRedeemTypeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
    }>;
    updateType(admin: AuthAdmin, id: string, dto: UpdateRedeemTypeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
    }>;
    removeType(admin: AuthAdmin, id: string): Promise<{
        ok: boolean;
        id: string;
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
    createCadence(admin: AuthAdmin, dto: CreateRedeemCadenceDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
        claimLimit: number;
        windowHours: number;
    }>;
    updateCadence(admin: AuthAdmin, id: string, dto: UpdateRedeemCadenceDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        enabled: boolean;
        claimLimit: number;
        windowHours: number;
    }>;
    removeCadence(admin: AuthAdmin, id: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    create(admin: AuthAdmin, dto: CreateRedeemCodeDto): Promise<{
        id: string;
        title: string;
        type: string;
        valueLabel: string;
        codeSecret: string;
        codeMasked: string;
        status: string;
        cadence: string;
        mode: string;
        stockLeft: number;
        poolLeft: number | null;
        coinCost: number | null;
        coinRewardMin: number | null;
        coinRewardMax: number | null;
        startsAt: string | null;
        endsAt: string | null;
        windowMinutes: number;
        codesPerWindow: number;
        expiresLabel: string;
        tip: string;
        redeemUrl: string;
    }>;
    update(admin: AuthAdmin, id: string, dto: UpdateRedeemCodeDto): Promise<{
        id: string;
        title: string;
        type: string;
        valueLabel: string;
        codeSecret: string;
        codeMasked: string;
        status: string;
        cadence: string;
        mode: string;
        stockLeft: number;
        poolLeft: number | null;
        coinCost: number | null;
        coinRewardMin: number | null;
        coinRewardMax: number | null;
        startsAt: string | null;
        endsAt: string | null;
        windowMinutes: number;
        codesPerWindow: number;
        expiresLabel: string;
        tip: string;
        redeemUrl: string;
    }>;
    appendPool(admin: AuthAdmin, id: string, dto: AppendRedeemPoolDto): Promise<{
        added: number;
        id: string;
        title: string;
        type: string;
        valueLabel: string;
        codeSecret: string;
        codeMasked: string;
        status: string;
        cadence: string;
        mode: string;
        stockLeft: number;
        poolLeft: number | null;
        coinCost: number | null;
        coinRewardMin: number | null;
        coinRewardMax: number | null;
        startsAt: string | null;
        endsAt: string | null;
        windowMinutes: number;
        codesPerWindow: number;
        expiresLabel: string;
        tip: string;
        redeemUrl: string;
    }>;
    remove(admin: AuthAdmin, id: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    reveal(admin: AuthAdmin, id: string, dto: RevealRedeemCodeDto): Promise<{
        id: string;
        title: string;
        mode: "SCRATCH_REWARD";
        codeMasked: string;
        code: string | null;
        unusedPreview: {
            id: string;
            codeMasked: string;
            code: string;
        }[];
    } | {
        id: string;
        title: string;
        mode: "SINGLE";
        codeMasked: string;
        code: string;
        unusedPreview: {
            id: string;
            codeMasked: string;
            code: string;
        }[];
    }>;
    private assertCanMutate;
}
