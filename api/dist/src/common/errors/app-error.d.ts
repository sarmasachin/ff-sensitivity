export type ApiErrorBody = {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
        requestId: string;
        timestamp: string;
    };
};
export declare class AppError extends Error {
    readonly code: string;
    readonly status: number;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, status: number, details?: Record<string, unknown> | undefined);
}
