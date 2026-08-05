import { PrismaService } from '../prisma/prisma.service';
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private toRow;
    adminList(limit?: number): Promise<{
        events: {
            id: string;
            atLabel: string;
            hoursAgo: number;
            actorName: string;
            actorEmail: string;
            category: import("./audit-security").AuditCategory;
            action: string;
            target: string;
            result: import("./audit-security").AuditResult;
            ipLabel: string;
            detail: string;
        }[];
    }>;
}
