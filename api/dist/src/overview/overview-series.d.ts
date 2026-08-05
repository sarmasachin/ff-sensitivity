import { PrismaService } from '../prisma/prisma.service';
export type OverviewSeriesRange = '7d' | '30d';
export declare const OVERVIEW_SERIES_RANGES: OverviewSeriesRange[];
export declare function parseOverviewSeriesRange(raw: string | undefined): OverviewSeriesRange;
export declare function seriesDayCount(range: OverviewSeriesRange): number;
export declare function utcDayKeys(days: number, now?: Date): string[];
export declare function dayLabel(isoDay: string): string;
export declare function buildOverviewSeries(prisma: PrismaService, range: OverviewSeriesRange, now?: Date): Promise<{
    range: OverviewSeriesRange;
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
