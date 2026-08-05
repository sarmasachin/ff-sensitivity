import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
export declare class UserAuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    private readonly analytics;
    private readonly googleClient;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, analytics: AnalyticsService);
    loginWithGoogle(dto: GoogleAuthDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            displayName: string;
            coins: number;
        };
    }>;
    logout(userId: string, installIdRaw?: string): Promise<{
        ok: true;
        tokenVersion: number;
    }>;
}
