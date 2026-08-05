export declare const OPEN_EVENT_NAMES: readonly ["app_open", "home_open"];
export declare const ALLOWED_EVENT_NAMES: readonly ["app_open", "home_open", "screen_session", "logout", "redeem_claim", "scratch_roll", "challenge_quiz_submit"];
export declare const CLIENT_EVENT_NAMES: readonly ["app_open", "home_open", "screen_session"];
export type AllowedEventName = (typeof ALLOWED_EVENT_NAMES)[number];
export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number];
export declare function assertEventName(raw: string): AllowedEventName;
export declare function assertClientEventName(raw: string): ClientEventName;
export declare function optionalInstallId(raw?: string | null): string | null;
export declare const SCREEN_SESSION_MIN_MS = 1000;
export declare const SCREEN_SESSION_MAX_MS: number;
export declare function sanitizeScreenSessionProps(raw: unknown): {
    screen: string;
    duration_ms: number;
};
export declare function sanitizeProps(raw: unknown): Record<string, string | number | boolean> | null;
