import { PrismaService } from '../prisma/prisma.service';
import type { StartSupportThreadDto, SupportMessageDto } from './dto/support.dto';
export declare class SupportService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
}
