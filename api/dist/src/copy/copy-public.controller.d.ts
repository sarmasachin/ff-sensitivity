import { CopyService } from './copy.service';
export declare class CopyPublicController {
    private readonly copy;
    constructor(copy: CopyService);
    live(): Promise<{
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
