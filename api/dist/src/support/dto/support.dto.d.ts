export declare const SUPPORT_SUBJECTS: readonly ["REPORT", "REDEEM_CODE_ISSUE", "BUG", "FEATURE", "FEEDBACK", "OTHER"];
export declare class StartSupportThreadDto {
    name: string;
    email: string;
    subject: (typeof SUPPORT_SUBJECTS)[number];
    message: string;
    appVersion: string;
    deviceLabel: string;
}
export declare class SupportMessageDto {
    message: string;
}
export declare class AdminSupportReplyDto {
    message: string;
}
