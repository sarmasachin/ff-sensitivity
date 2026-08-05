import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AnalyticsService } from '../analytics/analytics.service';
export declare class RedeemService {
    private readonly prisma;
    private readonly settings;
    private readonly analytics;
    constructor(prisma: PrismaService, settings: SettingsService, analytics: AnalyticsService);
    catalog(userId: string): Promise<{
        items: {
            id: string;
            type: import(".prisma/client").$Enums.RedeemType;
            title: string;
            valueLabel: string;
            codeMasked: string;
            code: string | null | undefined;
            status: string;
            expiresLabel: string;
            tip: string;
            redeemUrl: string;
            stockLeft: number;
            coinCost: number | null;
            cadence: import(".prisma/client").$Enums.RedeemCadence;
            unlocked: boolean;
        }[];
    }>;
    claim(userId: string, redeemCodeId: string): Promise<{
        id: string;
        code: string;
        alreadyClaimed: boolean;
        coinCost: number | null;
        coinsRemaining: number;
    }>;
    private assertRedeemId;
    private assertCadenceWindow;
    myClaims(userId: string): Promise<{
        id: string;
        redeemCodeId: string;
        title: string;
        valueLabel: string;
        type: import(".prisma/client").$Enums.RedeemType;
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
