import type { AuthAdmin } from '../auth/current-admin.decorator';
import { DevicesService } from './devices.service';
import { PatchDeviceNoteDto } from './dto/devices.dto';
export declare class DevicesAdminController {
    private readonly devices;
    constructor(devices: DevicesService);
    list(): Promise<{
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
    block(admin: AuthAdmin, id: string): Promise<{
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
    unblock(admin: AuthAdmin, id: string): Promise<{
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
    invalidate(admin: AuthAdmin, id: string): Promise<{
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
    note(admin: AuthAdmin, id: string, dto: PatchDeviceNoteDto): Promise<{
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
}
