import { PrismaService } from '../prisma/prisma.service';
import { type AllowedEventName } from './analytics-security';
export declare class AnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    trackSafe(input: {
        name: AllowedEventName | string;
        userId?: string | null;
        installId?: string | null;
        props?: Record<string, unknown> | null;
    }): void;
    track(input: {
        name: AllowedEventName | string;
        userId?: string | null;
        installId?: string | null;
        props?: Record<string, unknown> | null;
    }): Promise<{
        ok: false;
    } | {
        ok: true;
    }>;
    trackFromUser(userId: string, raw: {
        name: string;
        installId?: string;
        props?: Record<string, unknown>;
    }): Promise<{
        ok: false;
    } | {
        ok: true;
    }>;
    trackAnonOpen(installIdRaw: string, appVersion?: string): Promise<{
        ok: false;
    } | {
        ok: true;
    }>;
    engagementSnapshot(now?: Date): Promise<{
        dauToday: number;
        mau30d: number;
        eventsToday: number;
        topEvents: {
            name: string;
            count: number;
        }[];
        logoutToday: number;
    }>;
    funnelSnapshot(now?: Date): Promise<{
        installsToday: number;
        firstOpenToday: number;
        signupsToday: number;
        firstClaimsToday: number;
    }>;
    screenTimeSnapshot(now?: Date): Promise<{
        trackedUsersToday: number;
        screenVisitsToday: number;
        screenTimeTodaySeconds: number;
        avgScreenSeconds: number;
        topScreens: {
            screen: string;
            seconds: number;
            visits: number;
        }[];
    }>;
    private countFirstOpensToday;
    private countFirstClaimsToday;
    private countDistinctActors;
}
