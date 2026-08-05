import { AuditService } from './audit.service';
export declare class AuditAdminController {
    private readonly audit;
    constructor(audit: AuditService);
    list(limitRaw?: string): Promise<{
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
