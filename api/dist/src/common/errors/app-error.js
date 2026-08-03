"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    code;
    status;
    details;
    constructor(code, message, status, details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
//# sourceMappingURL=app-error.js.map