import type { AuthUser } from '../user-auth/current-user.decorator';
import { SupportService } from './support.service';
import { StartSupportThreadDto, SupportMessageDto } from './dto/support.dto';
export declare class SupportController {
    private readonly support;
    constructor(support: SupportService);
    mine(user: AuthUser): Promise<{
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
    start(user: AuthUser, dto: StartSupportThreadDto): Promise<{
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
    reply(user: AuthUser, id: string, dto: SupportMessageDto): Promise<{
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
