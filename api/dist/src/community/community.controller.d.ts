import type { AuthUser } from '../user-auth/current-user.decorator';
import { CommunityService } from './community.service';
import { SubmitCommunityPostDto } from './dto/community.dto';
export declare class CommunityController {
    private readonly community;
    constructor(community: CommunityService);
    feed(): Promise<{
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
        featured: boolean;
    }[]>;
    submit(user: AuthUser, dto: SubmitCommunityPostDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CommunityPostStatus;
        message: string;
    }>;
    report(user: AuthUser, id: string): Promise<{
        ok: boolean;
    }>;
}
