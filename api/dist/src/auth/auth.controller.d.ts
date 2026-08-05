import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
            role: string;
            allowedModules: string[];
            mustChangePassword: boolean;
            displayName: string;
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
    }): Promise<import("./auth-profile").AdminProfileView>;
    updateMe(req: {
        user: {
            id: string;
        };
    }, dto: UpdateProfileDto): Promise<import("./auth-profile").AdminProfileView>;
    changePassword(req: {
        user: {
            id: string;
        };
    }, dto: ChangePasswordDto): Promise<import("./auth-profile").AdminProfileView>;
    private setRefreshCookie;
    private cookieOpts;
}
