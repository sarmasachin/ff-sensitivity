import { PrismaService } from '../prisma/prisma.service';
import type { AdminSupportReplyDto, StartSupportThreadDto, SupportMessageDto } from './dto/support.dto';
export declare class SupportService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private toMessage;
    private toThreadRow;
    userGetMine(userId: string): Promise<{
        thread: {
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
        } | null;
    }>;
    userStart(userId: string, dto: StartSupportThreadDto): Promise<{
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
    userReply(userId: string, threadId: string, dto: SupportMessageDto): Promise<{
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
    adminList(q?: string, status?: string): Promise<{
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
}
