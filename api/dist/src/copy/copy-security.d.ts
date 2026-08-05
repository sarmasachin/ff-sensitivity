export declare function sanitizeCopyText(raw: string, max: number): string;
export declare function sanitizeCopyMultiline(raw: string, max: number): string;
export declare function assertSafeCopyText(text: string, field: string): void;
export declare function assertSafeFooterLine(raw: string): string;
export declare function assertAllowedPlaceholders(template: string): void;
export declare function normalizePlaceholders(template: string): string;
export declare const DEFAULT_COPY_CONFIG: {
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
};
