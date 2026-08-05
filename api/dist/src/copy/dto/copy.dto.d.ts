export declare class CopyRateDto {
    enabled: boolean;
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
    minSessions: number;
}
export declare class CopyShareDto {
    sheetTitle: string;
    bodyTemplate: string;
    footerLine: string;
    hashtags: string;
}
export declare class CopyAboutDto {
    headline: string;
    blurb: string;
    versionPrefix: string;
    websiteCta: string;
    privacyCta: string;
}
export declare class CopyLegalDto {
    privacyLabel: string;
    termsLabel: string;
    supportLabel: string;
    storeLabel: string;
}
export declare class SaveCopyConfigDto {
    rate: CopyRateDto;
    share: CopyShareDto;
    about: CopyAboutDto;
    legal: CopyLegalDto;
}
