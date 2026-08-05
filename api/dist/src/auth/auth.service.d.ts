import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    private readonly settings?;
    private readonly fails;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, settings?: SettingsService | undefined);
    login(dto: LoginDto, ip?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        admin: {
            id: string;
            email: string;
            role: string;
            allowedModules: string[];
            mustChangePassword: boolean;
            displayName: string;
        };
    }>;
    me(adminId: string): Promise<import("./auth-profile").AdminProfileView>;
    updateProfile(adminId: string, dto: UpdateProfileDto): Promise<import("./auth-profile").AdminProfileView>;
    changePassword(adminId: string, dto: ChangePasswordDto): Promise<import("./auth-profile").AdminProfileView>;
    logout(refreshToken: string | undefined): Promise<{
        ok: boolean;
    }>;
    private requireActiveAdmin;
    private hashToken;
    private assertNotLocked;
    private recordFail;
}
