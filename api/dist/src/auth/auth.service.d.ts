import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    private readonly fails;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    login(dto: LoginDto, ip?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        admin: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.AdminRole;
            allowedModules: import(".prisma/client").$Enums.AdminModule[];
            mustChangePassword: boolean;
        };
    }>;
    me(adminId: string): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.AdminRole;
        allowedModules: import(".prisma/client").$Enums.AdminModule[];
        mustChangePassword: boolean;
        lastLoginAt: Date | null;
    }>;
    logout(refreshToken: string | undefined): Promise<{
        ok: boolean;
    }>;
    private hashToken;
    private assertNotLocked;
    private recordFail;
}
