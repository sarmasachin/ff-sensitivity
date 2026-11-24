"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remapUnauthorized = remapUnauthorized;
function remapUnauthorized(status, code, message) {
    if (status === 401 && (code === 'Unauthorized' || message === 'Unauthorized')) {
        return {
            code: 'AUTH_REQUIRED',
            message: 'Session expired. Sign in again.',
        };
    }
    return { code, message };
}
//# sourceMappingURL=remap-unauthorized.js.map