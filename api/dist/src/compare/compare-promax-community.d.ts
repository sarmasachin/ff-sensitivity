import { PrismaService } from '../prisma/prisma.service';
export type CommunityAverages = {
    general: number;
    redDot: number;
    scope2x: number;
    scope4x: number;
    sniper: number;
    freeLook: number;
    fireButton: number;
};
export type CommunityPull = {
    n: number;
    weight: number;
    source: 'family' | 'role' | 'none';
    averages: CommunityAverages;
};
export declare function communityRolesForWizard(role: string): string[];
export declare function communityPullWeight(n: number): number;
export declare function communityRecencyWeight(createdAt: Date, nowMs?: number): number;
export declare function communityReportShrink(reports: number): number;
export declare function resolveCommunityPull(prisma: PrismaService, opts: {
    role?: string;
    deviceLabel?: string;
    excludeUserId?: string;
}): Promise<CommunityPull>;
