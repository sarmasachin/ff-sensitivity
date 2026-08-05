import type { AuthAdmin } from '../auth/current-admin.decorator';
import { SettingsService } from './settings.service';
import { SaveOpsSettingsDto } from './dto/settings.dto';
export declare class SettingsAdminController {
    private readonly settings;
    constructor(settings: SettingsService);
    get(): Promise<import("./settings-security").OpsSettingsBundle>;
    save(admin: AuthAdmin, dto: SaveOpsSettingsDto): Promise<import("./settings-security").OpsSettingsBundle>;
    purgeAudit(admin: AuthAdmin): Promise<{
        deleted: number;
        skipped: true;
        retentionDays: number;
        lastAuditPurgeAt: string | null;
    } | {
        deleted: number;
        skipped: false;
        retentionDays: number;
        lastAuditPurgeAt: string;
    }>;
}
