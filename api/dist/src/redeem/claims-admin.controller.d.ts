import type { AuthAdmin } from '../auth/current-admin.decorator';
import { FlagClaimDto, RevealClaimDto } from './dto/claims-admin.dto';
import { RedeemClaimsService } from './redeem-claims.service';
export declare class ClaimsAdminController {
    private readonly claims;
    constructor(claims: RedeemClaimsService);
    list(q?: string): Promise<{
        id: string;
        title: string;
        refId: string;
        codeMasked: string;
        deviceId: string;
        userId: string;
        userDisplayName: string | null;
        result: "FLAGGED" | "SUCCESS";
        whenLabel: string;
        createdAt: string;
        stockAfter: number;
        abuseScore: number;
        note: string;
    }[]>;
    stats(): Promise<{
        copied: number;
        blocked: number;
        flagged: number;
        devices: number;
    }>;
    reveal(admin: AuthAdmin, id: string, dto: RevealClaimDto): Promise<{
        id: string;
        codeMasked: string;
        code: string;
        title: string;
    }>;
    flag(admin: AuthAdmin, id: string, dto: FlagClaimDto): Promise<{
        id: string;
        title: string;
        refId: string;
        codeMasked: string;
        deviceId: string;
        userId: string;
        userDisplayName: string | null;
        result: "FLAGGED" | "SUCCESS";
        whenLabel: string;
        createdAt: string;
        stockAfter: number;
        abuseScore: number;
        note: string;
    }>;
    remove(admin: AuthAdmin, id: string): Promise<{
        ok: boolean;
    }>;
}
