import type { AuthAdmin } from '../auth/current-admin.decorator';
import { UsersService } from './users.service';
import { UserNoteDto, UserStatusDto } from './dto/users.dto';
export declare class UsersAdminController {
    private readonly users;
    constructor(users: UsersService);
    list(): Promise<{
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
    setStatus(admin: AuthAdmin, userId: string, dto: UserStatusDto): Promise<{
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
    setNote(admin: AuthAdmin, userId: string, dto: UserNoteDto): Promise<{
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
