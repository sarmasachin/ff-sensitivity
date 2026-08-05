import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { LoginDto } from './dto/login.dto';
import { ResendLoginOtpDto } from './dto/resend-login-otp.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import { LoginOtpMailService } from './login-otp-mail.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    private readonly otpMail;
    private readonly settings?;
    private readonly fails;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, otpMail: LoginOtpMailService, settings?: SettingsService | undefined);
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
    } | {
        requiresOtp: true;
        challengeId: string;
        expiresInSec: number;
        resendAfterSec: number;
        maskedEmail: string;
    }>;
    verifyLoginOtp(dto: VerifyLoginOtpDto, ip?: string): Promise<{
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
    resendLoginOtp(dto: ResendLoginOtpDto): Promise<{
        ok: true;
        expiresInSec: number;
        resendAfterSec: number;
        maskedEmail: string;
    }>;
    private createSession;
    me(adminId: string): Promise<import("./auth-profile").AdminProfileView>;
    updateProfile(adminId: string, dto: UpdateProfileDto): Promise<import("./auth-profile").AdminProfileView>;
    changePassword(adminId: string, dto: ChangePasswordDto): Promise<import("./auth-profile").AdminProfileView>;
    logout(refreshToken: string | undefined): Promise<{
        ok: boolean;
    }>;
    private createOtpChallenge;
    private otpEnabled;
    private generateOtp;
    private hashOtp;
    private maskEmail;
    private requireActiveAdmin;
    private hashToken;
    private assertNotLocked;
    private recordFail;
}
