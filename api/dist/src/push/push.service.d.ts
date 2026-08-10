import { PrismaService } from '../prisma/prisma.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import type { RegisterPushDeviceDto, UpsertPushCampaignDto } from './dto/push.dto';
import { DevicesService } from '../devices/devices.service';
export declare class PushService {
    private readonly prisma;
    private readonly devices;
    constructor(prisma: PrismaService, devices: DevicesService);
    private toRow;
    adminList(): Promise<{
        campaigns: {
            id: string;
            title: string;
            body: string;
            deepLink: string;
            audience: import(".prisma/client").$Enums.PushAudience;
            topic: string;
            status: import(".prisma/client").$Enums.PushStatus;
            scheduledAt: string | null;
            sentAt: string | null;
            delivered: number;
            failed: number;
            createdBy: string;
            updatedAt: string;
        }[];
    }>;
    adminUpsert(admin: AuthAdmin, dto: UpsertPushCampaignDto): Promise<{
        campaign: {
            id: string;
            title: string;
            body: string;
            deepLink: string;
            audience: import(".prisma/client").$Enums.PushAudience;
            topic: string;
            status: import(".prisma/client").$Enums.PushStatus;
            scheduledAt: string | null;
            sentAt: string | null;
            delivered: number;
            failed: number;
            createdBy: string;
            updatedAt: string;
        };
    }>;
    adminSend(admin: AuthAdmin, id: string): Promise<{
        campaign: {
            id: string;
            title: string;
            body: string;
            deepLink: string;
            audience: import(".prisma/client").$Enums.PushAudience;
            topic: string;
            status: import(".prisma/client").$Enums.PushStatus;
            scheduledAt: string | null;
            sentAt: string | null;
            delivered: number;
            failed: number;
            createdBy: string;
            updatedAt: string;
        };
    }>;
    private markSuspectedUninstalls;
    adminCancel(admin: AuthAdmin, id: string): Promise<{
        campaign: {
            id: string;
            title: string;
            body: string;
            deepLink: string;
            audience: import(".prisma/client").$Enums.PushAudience;
            topic: string;
            status: import(".prisma/client").$Enums.PushStatus;
            scheduledAt: string | null;
            sentAt: string | null;
            delivered: number;
            failed: number;
            createdBy: string;
            updatedAt: string;
        };
    }>;
    adminDelete(admin: AuthAdmin, id: string): Promise<{
        ok: boolean;
    }>;
    registerDevice(userId: string, dto: RegisterPushDeviceDto): Promise<{
        ok: boolean;
        platform: string;
        topics: string[];
        tokenHint: string;
    }>;
    inbox(userId: string): Promise<{
        messages: {
            id: string;
            title: string;
            body: string;
            deepLink: string;
            sentAt: string | null;
        }[];
    }>;
    private resolveAudienceTokens;
    private dedupeTokensByDevice;
    private resolveAudienceCount;
}
