import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
export declare class RedeemClaimsService {
    private readonly prisma;
    private readonly settings;
    constructor(prisma: PrismaService, settings: SettingsService);
    myClaims(userId: string): Promise<{
        id: string;
        redeemCodeId: string;
        title: string;
        valueLabel: string;
        type: string;
        redeemUrl: string;
        codeMasked: string;
        code: string;
        flagged: boolean;
        createdAt: string;
        whenLabel: string;
    }[]>;
    adminListClaims(query?: string): Promise<{
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
    adminClaimsStats(): Promise<{
        copied: number;
        blocked: number;
        flagged: number;
        devices: number;
    }>;
    adminFlagClaim(adminId: string, claimId: string, flagged: boolean, note?: string): Promise<{
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
    adminDeleteClaim(adminId: string, claimId: string): Promise<{
        ok: boolean;
    }>;
    adminRevealClaim(adminId: string, claimId: string, currentPassword?: string): Promise<{
        id: string;
        codeMasked: string;
        code: string;
        title: string;
    }>;
    private toAdminClaimRow;
    private assertClaimId;
}
