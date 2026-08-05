export declare function initFirebaseAdmin(): boolean;
export type FcmSendResult = {
    mode: 'fcm';
    delivered: number;
    failed: number;
    unregisteredTokens: string[];
};
export declare function sendFcmCampaign(input: {
    title: string;
    body: string;
    deepLink: string;
    audience: 'ALL' | 'ACTIVE_7D' | 'NO_CLAIM' | 'TOPIC';
    topic: string;
    tokens: string[];
}): Promise<FcmSendResult>;
