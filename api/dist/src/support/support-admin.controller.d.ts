import type { AuthAdmin } from '../auth/current-admin.decorator';
import { SupportService } from './support.service';
import { AdminSupportReplyDto } from './dto/support.dto';
export declare class SupportAdminController {
    private readonly support;
    constructor(support: SupportService);
    list(q?: string, status?: string): Promise<{
        threads: {
            id: string;
            name: string;
            email: string;
            subject: import(".prisma/client").$Enums.SupportSubject;
            status: import(".prisma/client").$Enums.SupportStatus;
            appVersion: string;
            deviceLabel: string;
            unread: boolean;
            createdAt: string;
            updatedAt: string;
            createdAtMs: number;
            updatedAtMs: number;
            messages: {
                id: string;
                sender: import(".prisma/client").$Enums.SupportSender;
                text: string;
                createdAt: string;
                createdAtMs: number;
            }[];
        }[];
    }>;
    stats(): Promise<{
        total: number;
        open: number;
        unread: number;
        replied: number;
        closed: number;
    }>;
    reply(admin: AuthAdmin, id: string, dto: AdminSupportReplyDto): Promise<{
        id: string;
        name: string;
        email: string;
        subject: import(".prisma/client").$Enums.SupportSubject;
        status: import(".prisma/client").$Enums.SupportStatus;
        appVersion: string;
        deviceLabel: string;
        unread: boolean;
        createdAt: string;
        updatedAt: string;
        createdAtMs: number;
        updatedAtMs: number;
        messages: {
            id: string;
            sender: import(".prisma/client").$Enums.SupportSender;
            text: string;
            createdAt: string;
            createdAtMs: number;
        }[];
    }>;
    close(admin: AuthAdmin, id: string): Promise<{
        id: string;
        name: string;
        email: string;
        subject: import(".prisma/client").$Enums.SupportSubject;
        status: import(".prisma/client").$Enums.SupportStatus;
        appVersion: string;
        deviceLabel: string;
        unread: boolean;
        createdAt: string;
        updatedAt: string;
        createdAtMs: number;
        updatedAtMs: number;
        messages: {
            id: string;
            sender: import(".prisma/client").$Enums.SupportSender;
            text: string;
            createdAt: string;
            createdAtMs: number;
        }[];
    }>;
    markRead(admin: AuthAdmin, id: string): Promise<{
        id: string;
        name: string;
        email: string;
        subject: import(".prisma/client").$Enums.SupportSubject;
        status: import(".prisma/client").$Enums.SupportStatus;
        appVersion: string;
        deviceLabel: string;
        unread: boolean;
        createdAt: string;
        updatedAt: string;
        createdAtMs: number;
        updatedAtMs: number;
        messages: {
            id: string;
            sender: import(".prisma/client").$Enums.SupportSender;
            text: string;
            createdAt: string;
            createdAtMs: number;
        }[];
    }>;
    deleteMessage(admin: AuthAdmin, id: string, messageId: string): Promise<{
        id: string;
        name: string;
        email: string;
        subject: import(".prisma/client").$Enums.SupportSubject;
        status: import(".prisma/client").$Enums.SupportStatus;
        appVersion: string;
        deviceLabel: string;
        unread: boolean;
        createdAt: string;
        updatedAt: string;
        createdAtMs: number;
        updatedAtMs: number;
        messages: {
            id: string;
            sender: import(".prisma/client").$Enums.SupportSender;
            text: string;
            createdAt: string;
            createdAtMs: number;
        }[];
    }>;
    deleteThread(admin: AuthAdmin, id: string): Promise<{
        ok: true;
        id: string;
    }>;
}
