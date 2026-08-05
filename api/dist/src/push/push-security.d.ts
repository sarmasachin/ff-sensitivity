export declare const ALLOWED_PUSH_DEEP_PATHS: Set<string>;
export declare function sanitizePushText(raw: string, max: number): string;
export declare function assertSafePushText(text: string, field: string): void;
export declare function assertSafeDeepLink(raw: string): string;
export declare function assertTopic(raw: string): string;
export declare function parseStamp(raw: string): Date;
export declare function stamp(d: Date | null | undefined): string | null;
