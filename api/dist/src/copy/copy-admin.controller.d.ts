import type { AuthAdmin } from '../auth/current-admin.decorator';
import { CopyService } from './copy.service';
import { SaveCopyConfigDto } from './dto/copy.dto';
export declare class CopyAdminController {
    private readonly copy;
    constructor(copy: CopyService);
    get(): Promise<{
        rate: {
            enabled: boolean;
            title: string;
            body: string;
            primaryCta: string;
            secondaryCta: string;
            minSessions: number;
        };
        share: {
            sheetTitle: string;
            bodyTemplate: string;
            footerLine: string;
            hashtags: string;
        };
        about: {
            headline: string;
            blurb: string;
            versionPrefix: string;
            websiteCta: string;
            privacyCta: string;
        };
        legal: {
            privacyLabel: string;
            termsLabel: string;
            supportLabel: string;
            storeLabel: string;
        };
    }>;
    save(admin: AuthAdmin, dto: SaveCopyConfigDto): Promise<{
        rate: {
            enabled: boolean;
            title: string;
            body: string;
            primaryCta: string;
            secondaryCta: string;
            minSessions: number;
        };
        share: {
            sheetTitle: string;
            bodyTemplate: string;
            footerLine: string;
            hashtags: string;
        };
        about: {
            headline: string;
            blurb: string;
            versionPrefix: string;
            websiteCta: string;
            privacyCta: string;
        };
        legal: {
            privacyLabel: string;
            termsLabel: string;
            supportLabel: string;
            storeLabel: string;
        };
    }>;
}
