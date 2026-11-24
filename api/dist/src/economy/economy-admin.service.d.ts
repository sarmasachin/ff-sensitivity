import { PrismaService } from '../prisma/prisma.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import type { SaveEconomyDto } from './dto/economy-admin.dto';
export declare class EconomyAdminService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getConfig(): Promise<{
        earn: {
            checkInCoins: number;
            quizCorrectCoins: number;
            quizWrongCoins: number;
            adBonusCoins: number;
        };
        limits: {
            walletCap: number;
            dailyEarnCap: number;
        };
        premiumUnlock: {
            bestPremium: number;
            premiumProMax: number;
            oneTapPremium: number;
            coinUnlockEnabled: boolean;
            adUnlockEnabled: boolean;
        };
        checkInEnabled: boolean;
        quizEnabled: boolean;
        adBonusEnabled: boolean;
    }>;
    saveConfig(admin: AuthAdmin, dto: SaveEconomyDto): Promise<{
        earn: {
            checkInCoins: number;
            quizCorrectCoins: number;
            quizWrongCoins: number;
            adBonusCoins: number;
        };
        limits: {
            walletCap: number;
            dailyEarnCap: number;
        };
        premiumUnlock: {
            bestPremium: number;
            premiumProMax: number;
            oneTapPremium: number;
            coinUnlockEnabled: boolean;
            adUnlockEnabled: boolean;
        };
        checkInEnabled: boolean;
        quizEnabled: boolean;
        adBonusEnabled: boolean;
    }>;
    private toConfig;
}
