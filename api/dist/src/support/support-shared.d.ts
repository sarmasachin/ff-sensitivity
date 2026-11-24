import { SupportSender, SupportStatus, SupportSubject } from '@prisma/client';
export declare const MAX_MESSAGES_PER_THREAD = 40;
export declare const MAX_OPEN_THREADS = 1;
export declare const LIST_LIMIT = 100;
export declare const SUPPORT_ACKNOWLEDGEMENT = "Thank you for contacting FF Sensitivity Support. We\u2019ve received your message successfully. Our support team will review the details and respond here. Depending on the nature of your request, resolution may take 12\u201372 hours. Please avoid sending duplicate messages, as this can delay processing.";
export declare function stamp(d: Date): string;
export declare function sanitizeText(raw: string, max: number): string;
export declare function assertSafeMessage(text: string): void;
export declare function assertThreadId(id: string, label?: string): void;
export declare function parseListStatus(status?: string): SupportStatus | SupportStatus[] | undefined;
export declare function parseListSubject(subject?: string): SupportSubject | undefined;
export declare function parseUnreadFlag(unread?: string): boolean | undefined;
export declare function toSupportMessage(m: {
    id: string;
    sender: SupportSender;
    text: string;
    createdAt: Date;
}): {
    id: string;
    sender: import(".prisma/client").$Enums.SupportSender;
    text: string;
    createdAt: string;
    createdAtMs: number;
};
export declare function toSupportThreadRow(t: {
    id: string;
    name: string;
    email: string;
    subject: SupportSubject;
    status: SupportStatus;
    appVersion: string;
    deviceLabel: string;
    unread: boolean;
    createdAt: Date;
    updatedAt: Date;
    messages: {
        id: string;
        sender: SupportSender;
        text: string;
        createdAt: Date;
    }[];
}): {
    id: string;
    name: string;
    email: string;
    subject: import(".prisma/client").$Enums.SupportSubject;
    status: import(".prisma/client").$Enums.SupportStatus;
    appVersion: string;
    deviceLabel: string;
    unread: boolean;
    createdAt: string;
    updatedAt: string;
    createdAtMs: number;
    updatedAtMs: number;
    messages: {
        id: string;
        sender: import(".prisma/client").$Enums.SupportSender;
        text: string;
        createdAt: string;
        createdAtMs: number;
    }[];
};
