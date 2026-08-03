import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly auth;
    private readonly config;
    constructor(auth: AuthService, config: ConfigService);
    login(dto: LoginDto, req: {
        ip?: string;
        headers: Record<string, string | undefined>;
    }, res: Response): Promise<{
        accessToken: string;
        admin: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.AdminRole;
            allowedModules: import(".prisma/client").$Enums.AdminModule[];
            mustChangePassword: boolean;
        };
    }>;
    logout(req: {
        cookies?: {
            refresh_token?: string;
        };
    }, res: Response): Promise<{
        ok: boolean;
    }>;
    me(req: {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.AdminRole;
        allowedModules: import(".prisma/client").$Enums.AdminModule[];
        mustChangePassword: boolean;
        lastLoginAt: Date | null;
    }>;
    private setRefreshCookie;
    private cookieOpts;
}
