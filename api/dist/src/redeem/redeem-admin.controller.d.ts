import type { AuthAdmin } from '../auth/current-admin.decorator';
import { RedeemAdminService } from './redeem-admin.service';
import { CreateRedeemCodeDto, RevealRedeemCodeDto, UpdateRedeemCodeDto } from './dto/redeem-admin.dto';
export declare class RedeemAdminController {
    private readonly redeem;
    constructor(redeem: RedeemAdminService);
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
    create(admin: AuthAdmin, dto: CreateRedeemCodeDto): Promise<{
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
    update(admin: AuthAdmin, id: string, dto: UpdateRedeemCodeDto): Promise<{
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
    remove(admin: AuthAdmin, id: string): Promise<{
        ok: boolean;
        id: string;
    }>;
    reveal(admin: AuthAdmin, id: string, dto: RevealRedeemCodeDto): Promise<{
        id: string;
        title: string;
        codeMasked: string;
        code: string;
    }>;
    private assertCanMutate;
}
