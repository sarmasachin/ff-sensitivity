import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppConfigService } from './app-config.service';
import { SaveProMaxConfigDto } from './dto/promax-config.dto';
export declare class AppConfigProMaxAdminController {
    private readonly appConfig;
    constructor(appConfig: AppConfigService);
    get(): Promise<import("./app-config-promax").ProMaxConfigBundle>;
    save(admin: AuthAdmin, dto: SaveProMaxConfigDto): Promise<import("./app-config-promax").ProMaxConfigBundle>;
}
