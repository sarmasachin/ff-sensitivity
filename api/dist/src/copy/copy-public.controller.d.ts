import { CopyService } from './copy.service';
export declare class CopyPublicController {
    private readonly copy;
    constructor(copy: CopyService);
    live(): Promise<{
        share: {
            footerLine: string;
            sheetTitle: string;
            bodyTemplate: string;
            hashtags: string;
        };
        rate: {
            enabled: boolean;
            title: string;
            body: string;
            primaryCta: string;
            secondaryCta: string;
            minSessions: number;
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
