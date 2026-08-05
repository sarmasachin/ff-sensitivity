import type { AuthAdmin } from '../auth/current-admin.decorator';
import { CommunityService } from './community.service';
import { UpdateCommunityStatusDto } from './dto/community.dto';
export declare class CommunityAdminController {
    private readonly community;
    constructor(community: CommunityService);
    list(q?: string, status?: string): Promise<{
        id: string;
        name: string;
        freeFireId: string;
        rank: string;
        role: string;
        deviceLabel: string;
        deviceMeta: string;
        matches: number;
        kills: number;
        headshots: number;
        general: number;
        redDot: number;
        scope2x: number;
        scope4x: number;
        awm: number;
        freeLook: number;
        status: import(".prisma/client").$Enums.CommunityPostStatus;
        reports: number;
        createdAt: string;
        submittedLabel: string;
    }[]>;
    stats(): Promise<{
        pending: number;
        live: number;
        featured: number;
        flagged: number;
        hidden: number;
    }>;
    setStatus(admin: AuthAdmin, id: string, dto: UpdateCommunityStatusDto): Promise<{
        id: string;
        name: string;
        freeFireId: string;
        rank: string;
        role: string;
        deviceLabel: string;
        deviceMeta: string;
        matches: number;
        kills: number;
        headshots: number;
        general: number;
        redDot: number;
        scope2x: number;
        scope4x: number;
        awm: number;
        freeLook: number;
        status: import(".prisma/client").$Enums.CommunityPostStatus;
        reports: number;
        createdAt: string;
        submittedLabel: string;
    }>;
}
