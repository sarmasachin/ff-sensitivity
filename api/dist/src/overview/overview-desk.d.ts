import { PrismaClient } from '@prisma/client';
export type DeskRange = 'today' | '7d' | '30d';
export declare function parseDeskRange(raw: string | undefined): DeskRange;
export declare function buildOverviewDesk(prisma: PrismaClient, range: DeskRange, now?: Date): Promise<{
    kpis: {
        activeCodes: number;
        claimsToday: number;
        lowStock: number;
        pendingSupport: number;
        pushSends: number;
        walletNet: number;
    };
    trend: {
        label: string;
        claims: number;
        scratch: number;
    }[];
    inventory: ({
        id: string;
        label: string;
        count: number;
        tone: "emerald";
    } | {
        id: string;
        label: string;
        count: number;
        tone: "amber";
    } | {
        id: string;
        label: string;
        count: number;
        tone: "slate";
    } | {
        id: string;
        label: string;
        count: number;
        tone: "sky";
    } | {
        id: string;
        label: string;
        count: number;
        tone: "rose";
    })[];
    claimsMix: {
        id: string;
        label: string;
        value: number;
        color: string;
    }[];
    support: {
        id: string;
        subject: string;
        priority: "P1" | "P2" | "P3";
        age: string;
    }[];
    wallet: {
        label: string;
        grant: number;
        revoke: number;
    }[];
    activity: {
        id: string;
        time: string;
        actor: string;
        action: string;
        module: import("../audit/audit-security").AuditCategory;
    }[];
    refreshedAt: string;
}>;
