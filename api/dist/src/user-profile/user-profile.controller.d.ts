import { type AuthUser } from '../user-auth/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileService } from './user-profile.service';
export declare class UserProfileController {
    private readonly profile;
    constructor(profile: UserProfileService);
    get(user: AuthUser): Promise<{
        profile: {
            googleName: string;
            email: string;
            photoUrl: string | null;
            displayName: string;
            ffUid: string;
            playRole: string;
            region: string;
            notifyPush: boolean;
            coins: number;
            streakDays: number;
        };
    }>;
    update(user: AuthUser, dto: UpdateProfileDto): Promise<{
        profile: {
            googleName: string;
            email: string;
            photoUrl: string | null;
            displayName: string;
            ffUid: string;
            playRole: string;
            region: string;
            notifyPush: boolean;
            coins: number;
            streakDays: number;
        };
    }>;
    deleteAccount(user: AuthUser): Promise<{
        ok: true;
    }>;
}
