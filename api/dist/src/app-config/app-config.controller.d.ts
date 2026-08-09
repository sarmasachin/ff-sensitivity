import { AppConfigService } from './app-config.service';
export declare class AppConfigController {
    private readonly appConfig;
    constructor(appConfig: AppConfigService);
    live(): Promise<{
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
        ads: import("./app-config-ads").AdsConfigBundle;
        links: {
            playStoreUrl: string;
            privacyUrl: string;
            websiteUrl: string;
            supportEmail: string;
        };
    }>;
}
