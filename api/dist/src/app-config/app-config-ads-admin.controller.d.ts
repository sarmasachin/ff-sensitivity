import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppConfigService } from './app-config.service';
import { SaveAdsConfigDto } from './dto/ads-config.dto';
export declare class AppConfigAdsAdminController {
    private readonly appConfig;
    constructor(appConfig: AppConfigService);
    get(): Promise<import("./app-config-ads").AdsConfigBundle>;
    save(admin: AuthAdmin, dto: SaveAdsConfigDto): Promise<import("./app-config-ads").AdsConfigBundle>;
}
