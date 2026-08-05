import type { AuthUser } from '../user-auth/current-user.decorator';
import { EconomyService } from './economy.service';
import { ChallengeEarnDto, ShopPurchaseDto } from './dto/economy.dto';
export declare class EconomyController {
    private readonly economy;
    constructor(economy: EconomyService);
    wallet(user: AuthUser): Promise<{
        coins: number;
        frozen: boolean;
        boosts: {
            [k: string]: number;
        };
    }>;
    earn(user: AuthUser, dto: ChallengeEarnDto): Promise<{
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    purchase(user: AuthUser, dto: ShopPurchaseDto): Promise<{
        coins: number;
        itemId: string;
        alreadyApplied: boolean;
    }>;
}
