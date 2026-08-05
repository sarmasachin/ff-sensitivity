import { PrismaService } from '../prisma/prisma.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { SettingsService } from '../settings/settings.service';
import type { WalletAdjustDto } from './dto/wallets.dto';
export declare class WalletsService {
    private readonly prisma;
    private readonly settings;
    constructor(prisma: PrismaService, settings: SettingsService);
    private assertCanMutate;
    private toWalletRow;
    adminListWallets(): Promise<{
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
    adminListLedger(): Promise<{
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
    adminGrant(admin: AuthAdmin, userIdRaw: string, dto: WalletAdjustDto): Promise<{
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
    adminRevoke(admin: AuthAdmin, userIdRaw: string, dto: WalletAdjustDto): Promise<{
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
    adminFreeze(admin: AuthAdmin, userIdRaw: string, action: 'freeze' | 'unfreeze'): Promise<{
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
