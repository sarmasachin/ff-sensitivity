import { PrismaService } from '../prisma/prisma.service';
import type { AdminSupportReplyDto } from './dto/support.dto';
export declare class SupportAdminInboxService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    adminList(q?: string, status?: string, subject?: string, unread?: string): Promise<{
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
    adminStats(): Promise<{
        total: number;
        open: number;
        unread: number;
        replied: number;
        closed: number;
    }>;
    adminReply(adminId: string, threadId: string, dto: AdminSupportReplyDto): Promise<{
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
    adminClose(adminId: string, threadId: string): Promise<{
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
    adminMarkRead(adminId: string, threadId: string): Promise<{
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
    adminDeleteThread(adminId: string, threadId: string): Promise<{
        ok: true;
        id: string;
    }>;
    adminDeleteUserMessage(adminId: string, threadId: string, messageId: string): Promise<{
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
}
