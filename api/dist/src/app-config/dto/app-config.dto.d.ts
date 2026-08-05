export declare class AppStatusDto {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    forceUpdate: boolean;
    softUpdatePrompt: boolean;
    minVersionCode: number;
    minVersionName: string;
}
export declare class AppLinksDto {
    playStoreUrl: string;
    privacyUrl: string;
    websiteUrl: string;
    supportEmail: string;
}
export declare class SaveAppConfigDto {
    status: AppStatusDto;
    features: Record<string, boolean>;
    navigation: Record<string, boolean>;
    links: AppLinksDto;
}
