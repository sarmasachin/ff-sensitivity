import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppConfigService } from './app-config.service';
import { SaveAppConfigDto } from './dto/app-config.dto';
export declare class AppConfigAdminController {
    private readonly appConfig;
    constructor(appConfig: AppConfigService);
    get(): Promise<{
        status: {
            maintenanceMode: boolean;
            maintenanceMessage: string;
            forceUpdate: boolean;
            softUpdatePrompt: boolean;
            minVersionCode: number;
            minVersionName: string;
        };
        features: Record<string, boolean>;
        navigation: Record<string, boolean>;
        links: {
            playStoreUrl: string;
            privacyUrl: string;
            websiteUrl: string;
            supportEmail: string;
        };
    }>;
    save(admin: AuthAdmin, dto: SaveAppConfigDto): Promise<{
        status: {
            maintenanceMode: boolean;
            maintenanceMessage: string;
            forceUpdate: boolean;
            softUpdatePrompt: boolean;
            minVersionCode: number;
            minVersionName: string;
        };
        features: Record<string, boolean>;
        navigation: Record<string, boolean>;
        links: {
            playStoreUrl: string;
            privacyUrl: string;
            websiteUrl: string;
            supportEmail: string;
        };
    }>;
}
