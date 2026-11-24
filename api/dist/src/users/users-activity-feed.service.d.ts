import { PrismaService } from '../prisma/prisma.service';
export declare const ACTIVITY_FEED_EVENTS: readonly ["app_open", "login", "redeem_claim", "scratch_roll", "logout"];
export type ActivityFeedEventName = (typeof ACTIVITY_FEED_EVENTS)[number];
export declare class UsersActivityFeedService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    forUser(userIdRaw: string, daysRaw?: string): Promise<{
        days: number;
        since: string;
        summary: {
            total: number;
            counts: Record<"login" | "logout" | "app_open" | "redeem_claim" | "scratch_roll", number>;
        };
        items: {
            id: string;
            name: ActivityFeedEventName;
            detail: string | null;
            at: string;
        }[];
    }>;
}
