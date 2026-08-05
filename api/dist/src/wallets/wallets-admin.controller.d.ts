import type { AuthAdmin } from '../auth/current-admin.decorator';
import { WalletsService } from './wallets.service';
import { WalletAdjustDto, WalletFreezeDto } from './dto/wallets.dto';
export declare class WalletsAdminController {
    private readonly wallets;
    constructor(wallets: WalletsService);
    list(): Promise<{
        wallets: {
            id: string;
            deviceId: string;
            label: string;
            balance: number;
            lifetimeEarned: number;
            lifetimeSpent: number;
            status: "ACTIVE" | "FROZEN";
            lastTxnLabel: string;
            lastTxnHoursAgo: number;
            note: string;
        }[];
    }>;
    ledger(): Promise<{
        ledger: {
            id: string;
            walletId: string;
            deviceId: string;
            label: string;
            kind: "EARN" | "SPEND" | "GRANT" | "REVOKE" | "PURCHASE" | "ADJUST";
            amount: number;
            balanceAfter: number;
            reason: string;
            whenLabel: string;
            actor: "staff" | "system" | "store";
        }[];
    }>;
    grant(admin: AuthAdmin, userId: string, dto: WalletAdjustDto): Promise<{
        coins: number;
        alreadyApplied: boolean;
        wallet: {
            id: string;
            deviceId: string;
            label: string;
            balance: number;
            lifetimeEarned: number;
            lifetimeSpent: number;
            status: "ACTIVE" | "FROZEN";
            lastTxnLabel: string;
            lastTxnHoursAgo: number;
            note: string;
        } | undefined;
    }>;
    revoke(admin: AuthAdmin, userId: string, dto: WalletAdjustDto): Promise<{
        coins: number;
        alreadyApplied: boolean;
        wallet: {
            id: string;
            deviceId: string;
            label: string;
            balance: number;
            lifetimeEarned: number;
            lifetimeSpent: number;
            status: "ACTIVE" | "FROZEN";
            lastTxnLabel: string;
            lastTxnHoursAgo: number;
            note: string;
        } | undefined;
    }>;
    freeze(admin: AuthAdmin, userId: string, dto: WalletFreezeDto): Promise<{
        wallet: {
            id: string;
            deviceId: string;
            label: string;
            balance: number;
            lifetimeEarned: number;
            lifetimeSpent: number;
            status: "ACTIVE" | "FROZEN";
            lastTxnLabel: string;
            lastTxnHoursAgo: number;
            note: string;
        } | undefined;
    }>;
}
