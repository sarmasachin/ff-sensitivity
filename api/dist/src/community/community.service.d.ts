import { CommunityPostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitCommunityPostDto } from './dto/community.dto';
export declare class CommunityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    submit(userId: string, dto: SubmitCommunityPostDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CommunityPostStatus;
        message: string;
    }>;
    report(userId: string, postId: string): Promise<{
        ok: boolean;
    }>;
    adminList(query?: string, status?: string): Promise<{
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
    adminStats(): Promise<{
        pending: number;
        live: number;
        featured: number;
        flagged: number;
        hidden: number;
    }>;
    adminSetStatus(adminId: string, postId: string, status: CommunityPostStatus): Promise<{
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
    private assertCleanText;
    private toPublicCard;
    private toAdminRow;
}
