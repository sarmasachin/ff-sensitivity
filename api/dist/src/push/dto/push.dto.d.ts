export declare const PUSH_AUDIENCES: readonly ["ALL", "ACTIVE_7D", "NO_CLAIM", "TOPIC"];
export declare const PUSH_SCHEDULE_MODES: readonly ["draft", "later", "now"];
export declare class UpsertPushCampaignDto {
    id: string;
    title: string;
    body: string;
    deepLink: string;
    audience: (typeof PUSH_AUDIENCES)[number];
    topic?: string;
    scheduleMode: (typeof PUSH_SCHEDULE_MODES)[number];
    scheduledAt?: string;
}
export declare class RegisterPushDeviceDto {
    token: string;
    platform?: 'android' | 'ios';
    topics?: string[];
    installId?: string;
}
