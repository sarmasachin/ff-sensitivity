import type { AuthAdmin } from '../auth/current-admin.decorator';
import { EconomyAdminService } from './economy-admin.service';
import { SaveEconomyDto } from './dto/economy-admin.dto';
export declare class EconomyAdminController {
    private readonly economy;
    constructor(economy: EconomyAdminService);
    get(): Promise<{
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
    save(admin: AuthAdmin, dto: SaveEconomyDto): Promise<{
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
}
