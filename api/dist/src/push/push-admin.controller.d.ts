import type { AuthAdmin } from '../auth/current-admin.decorator';
import { PushService } from './push.service';
import { UpsertPushCampaignDto } from './dto/push.dto';
export declare class PushAdminController {
    private readonly push;
    constructor(push: PushService);
    list(): Promise<{
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
    upsert(admin: AuthAdmin, dto: UpsertPushCampaignDto): Promise<{
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
    send(admin: AuthAdmin, id: string): Promise<{
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
    cancel(admin: AuthAdmin, id: string): Promise<{
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
    remove(admin: AuthAdmin, id: string): Promise<{
        ok: boolean;
    }>;
}
