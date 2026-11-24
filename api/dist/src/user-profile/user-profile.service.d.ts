import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class UserProfileService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    get(userId: string): Promise<{
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
    update(userId: string, dto: UpdateProfileDto): Promise<{
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
    deleteAccount(userId: string): Promise<{
        ok: true;
    }>;
    private syncPush;
    private load;
    private toView;
}
