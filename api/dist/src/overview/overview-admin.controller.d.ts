import { OverviewService } from './overview.service';
export declare class OverviewAdminController {
    private readonly overview;
    constructor(overview: OverviewService);
    snapshot(): Promise<{
        users: {
            total: number;
            newToday: number;
            new7d: number;
            active: number;
            restricted: number;
            suspended: number;
            loggedIn7d: number;
        };
        devices: {
            total: number;
            active72h: number;
            stale: number;
            blocked: number;
            pushActive7d: number;
        };
        redeem: {
            activeCodes: number;
            lowStock: number;
        };
        today: {
            claims: number;
            scratch: number;
            walletNet: number;
            pendingSupport: number;
        };
        engagement: {
            dauToday: number;
            mau30d: number;
            eventsToday: number;
            topEvents: {
                name: string;
                count: number;
            }[];
            logoutToday: number;
        };
        funnel: {
            installsToday: number;
            firstOpenToday: number;
            signupsToday: number;
            firstClaimsToday: number;
        };
        p3: {
            screenTime: {
                trackedUsersToday: number;
                screenVisitsToday: number;
                screenTimeTodaySeconds: number;
                avgScreenSeconds: number;
                topScreens: {
                    screen: string;
                    seconds: number;
                    visits: number;
                }[];
            };
            installHealth: {
                suspectedUninstalls: number;
                registeredWithoutOpenEvent: number;
                stale72h: number;
            };
            crashReporting: {
                provider: string;
                liveKpiAvailable: boolean;
                dashboardUrl: string;
            };
        };
        meta: {
            staleHours: number;
            pushActiveDays: number;
            lowStockMax: number;
            dayBasis: string;
        };
        refreshedAt: string;
    }>;
    series(range?: string): Promise<{
        range: import("./overview-series").OverviewSeriesRange;
        dayBasis: "utc";
        points: {
            day: string;
            label: string;
            dau: number;
            claims: number;
            signups: number;
            screenVisits: number;
        }[];
        funnel: {
            installs: number;
            firstOpen: number;
            signups: number;
            firstClaims: number;
        };
        topScreens: {
            screen: string;
            seconds: number;
            visits: number;
        }[];
        refreshedAt: string;
    }>;
    desk(range?: string): Promise<{
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
}
