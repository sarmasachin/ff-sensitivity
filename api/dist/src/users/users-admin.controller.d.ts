import type { AuthAdmin } from '../auth/current-admin.decorator';
import { UsersService } from './users.service';
import { UsersScreenJourneyService } from './users-screen-journey.service';
import { UsersActivityFeedService } from './users-activity-feed.service';
import { UserNoteDto, UserStatusDto } from './dto/users.dto';
export declare class UsersAdminController {
    private readonly users;
    private readonly screenJourney;
    private readonly activityFeed;
    constructor(users: UsersService, screenJourney: UsersScreenJourneyService, activityFeed: UsersActivityFeedService);
    list(): Promise<{
        users: {
            id: string;
            displayName: string;
            googleName: string;
            photoUrl: string | null;
            email: string;
            googleSubMasked: string;
            status: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "DELETED";
            joinedLabel: string;
            lastActiveLabel: string;
            lastActiveHoursAgo: number;
            deviceId: string;
            deviceLabel: string;
            appVersion: string;
            coinBalance: number;
            streakDays: number;
            claimsCount: number;
            redeemUnlocks: number;
            ffUid: string;
            playRole: string;
            regionLabel: string;
            notifyPush: boolean;
            note: string;
        }[];
        stats: import("./users-stats").UserDeskStats;
    }>;
    screenJourneyForUser(userId: string, days?: string): Promise<{
        days: number;
        since: string;
        summary: {
            visits: number;
            totalSeconds: number;
            uniqueScreens: number;
        };
        byScreen: {
            screen: string;
            visits: number;
            seconds: number;
        }[];
        timeline: {
            id: string;
            screen: string;
            durationMs: number;
            seconds: number;
            at: string;
        }[];
    }>;
    activityFeedForUser(userId: string, days?: string): Promise<{
        days: number;
        since: string;
        summary: {
            total: number;
            counts: Record<"login" | "logout" | "app_open" | "redeem_claim" | "scratch_roll", number>;
        };
        items: {
            id: string;
            name: import("./users-activity-feed.service").ActivityFeedEventName;
            detail: string | null;
            at: string;
        }[];
    }>;
    setStatus(admin: AuthAdmin, userId: string, dto: UserStatusDto): Promise<{
        user: {
            id: string;
            displayName: string;
            googleName: string;
            photoUrl: string | null;
            email: string;
            googleSubMasked: string;
            status: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "DELETED";
            joinedLabel: string;
            lastActiveLabel: string;
            lastActiveHoursAgo: number;
            deviceId: string;
            deviceLabel: string;
            appVersion: string;
            coinBalance: number;
            streakDays: number;
            claimsCount: number;
            redeemUnlocks: number;
            ffUid: string;
            playRole: string;
            regionLabel: string;
            notifyPush: boolean;
            note: string;
        };
    }>;
    setNote(admin: AuthAdmin, userId: string, dto: UserNoteDto): Promise<{
        user: {
            id: string;
            displayName: string;
            googleName: string;
            photoUrl: string | null;
            email: string;
            googleSubMasked: string;
            status: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "DELETED";
            joinedLabel: string;
            lastActiveLabel: string;
            lastActiveHoursAgo: number;
            deviceId: string;
            deviceLabel: string;
            appVersion: string;
            coinBalance: number;
            streakDays: number;
            claimsCount: number;
            redeemUnlocks: number;
            ffUid: string;
            playRole: string;
            regionLabel: string;
            notifyPush: boolean;
            note: string;
        };
    }>;
    deleteData(admin: AuthAdmin, userId: string): Promise<{
        user: {
            id: string;
            displayName: string;
            googleName: string;
            photoUrl: string | null;
            email: string;
            googleSubMasked: string;
            status: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "DELETED";
            joinedLabel: string;
            lastActiveLabel: string;
            lastActiveHoursAgo: number;
            deviceId: string;
            deviceLabel: string;
            appVersion: string;
            coinBalance: number;
            streakDays: number;
            claimsCount: number;
            redeemUnlocks: number;
            ffUid: string;
            playRole: string;
            regionLabel: string;
            notifyPush: boolean;
            note: string;
        };
    }>;
}
