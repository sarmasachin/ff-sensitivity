import { PrismaService } from '../prisma/prisma.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import type { UserNoteDto, UserStatusDto } from './dto/users.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private assertCanMutate;
    private readonly installSelect;
    private attachSharedInstalls;
    private toUserRow;
    private loadRow;
    adminListUsers(): Promise<{
        users: {
            id: string;
            displayName: string;
            email: string;
            googleSubMasked: string;
            status: "ACTIVE" | "RESTRICTED" | "SUSPENDED";
            joinedLabel: string;
            lastActiveLabel: string;
            lastActiveHoursAgo: number;
            deviceId: string;
            deviceLabel: string;
            appVersion: string;
            coinBalance: number;
            claimsCount: number;
            redeemUnlocks: number;
            regionLabel: string;
            note: string;
        }[];
    }>;
    adminSetStatus(admin: AuthAdmin, userIdRaw: string, dto: UserStatusDto): Promise<{
        user: {
            id: string;
            displayName: string;
            email: string;
            googleSubMasked: string;
            status: "ACTIVE" | "RESTRICTED" | "SUSPENDED";
            joinedLabel: string;
            lastActiveLabel: string;
            lastActiveHoursAgo: number;
            deviceId: string;
            deviceLabel: string;
            appVersion: string;
            coinBalance: number;
            claimsCount: number;
            redeemUnlocks: number;
            regionLabel: string;
            note: string;
        };
    }>;
    adminSetNote(admin: AuthAdmin, userIdRaw: string, dto: UserNoteDto): Promise<{
        user: {
            id: string;
            displayName: string;
            email: string;
            googleSubMasked: string;
            status: "ACTIVE" | "RESTRICTED" | "SUSPENDED";
            joinedLabel: string;
            lastActiveLabel: string;
            lastActiveHoursAgo: number;
            deviceId: string;
            deviceLabel: string;
            appVersion: string;
            coinBalance: number;
            claimsCount: number;
            redeemUnlocks: number;
            regionLabel: string;
            note: string;
        };
    }>;
}
