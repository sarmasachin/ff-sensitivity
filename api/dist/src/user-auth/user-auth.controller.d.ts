import { UserAuthService } from './user-auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { UserLogoutDto } from './dto/user-logout.dto';
import { type AuthUser } from './current-user.decorator';
export declare class UserAuthController {
    private readonly userAuth;
    constructor(userAuth: UserAuthService);
    google(dto: GoogleAuthDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            displayName: string;
            coins: number;
        };
    }>;
    logout(user: AuthUser, dto: UserLogoutDto): Promise<{
        ok: true;
        tokenVersion: number;
    }>;
}
