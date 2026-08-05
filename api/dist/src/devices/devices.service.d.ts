import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import type { DeviceHeartbeatDto, PatchDeviceNoteDto } from './dto/devices.dto';
export declare class DevicesService {
    private readonly prisma;
    private readonly analytics;
    constructor(prisma: PrismaService, analytics: AnalyticsService);
    private toRow;
    heartbeat(userId: string, dto: DeviceHeartbeatDto): Promise<{
        ok: boolean;
        blocked: boolean;
        message: string;
    } | {
        ok: boolean;
        blocked: boolean;
        message?: undefined;
    }>;
    adminList(): Promise<{
        devices: {
            id: string;
            deviceId: string;
            label: string;
            brand: string;
            model: string;
            androidVersion: string;
            appVersion: string;
            appVersionCode: number;
            fcmTokenMasked: string;
            hasFcmToken: boolean;
            status: "ACTIVE" | "STALE" | "BLOCKED";
            lastSeenLabel: string;
            lastSeenHoursAgo: number;
            pushEnabled: boolean;
            coinBalance: number;
            note: string;
        }[];
    }>;
    private assertCanMutate;
    private loadOrThrow;
    adminBlock(admin: AuthAdmin, id: string): Promise<{
        device: {
            id: string;
            deviceId: string;
            label: string;
            brand: string;
            model: string;
            androidVersion: string;
            appVersion: string;
            appVersionCode: number;
            fcmTokenMasked: string;
            hasFcmToken: boolean;
            status: "ACTIVE" | "STALE" | "BLOCKED";
            lastSeenLabel: string;
            lastSeenHoursAgo: number;
            pushEnabled: boolean;
            coinBalance: number;
            note: string;
        };
    }>;
    adminUnblock(admin: AuthAdmin, id: string): Promise<{
        device: {
            id: string;
            deviceId: string;
            label: string;
            brand: string;
            model: string;
            androidVersion: string;
            appVersion: string;
            appVersionCode: number;
            fcmTokenMasked: string;
            hasFcmToken: boolean;
            status: "ACTIVE" | "STALE" | "BLOCKED";
            lastSeenLabel: string;
            lastSeenHoursAgo: number;
            pushEnabled: boolean;
            coinBalance: number;
            note: string;
        };
    }>;
    adminInvalidateToken(admin: AuthAdmin, id: string): Promise<{
        device: {
            id: string;
            deviceId: string;
            label: string;
            brand: string;
            model: string;
            androidVersion: string;
            appVersion: string;
            appVersionCode: number;
            fcmTokenMasked: string;
            hasFcmToken: boolean;
            status: "ACTIVE" | "STALE" | "BLOCKED";
            lastSeenLabel: string;
            lastSeenHoursAgo: number;
            pushEnabled: boolean;
            coinBalance: number;
            note: string;
        };
    }>;
    adminPatchNote(admin: AuthAdmin, id: string, dto: PatchDeviceNoteDto): Promise<{
        device: {
            id: string;
            deviceId: string;
            label: string;
            brand: string;
            model: string;
            androidVersion: string;
            appVersion: string;
            appVersionCode: number;
            fcmTokenMasked: string;
            hasFcmToken: boolean;
            status: "ACTIVE" | "STALE" | "BLOCKED";
            lastSeenLabel: string;
            lastSeenHoursAgo: number;
            pushEnabled: boolean;
            coinBalance: number;
            note: string;
        };
    }>;
    assertInstallAllowed(userId: string, installIdRaw?: string): Promise<void>;
    filterEnabledTokens<T extends {
        userId: string;
        installId?: string | null;
        token: string;
    }>(rows: T[]): Promise<T[]>;
}
