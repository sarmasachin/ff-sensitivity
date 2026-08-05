"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const app_error_1 = require("./app-error");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();
        const requestId = req.requestId ?? (0, crypto_1.randomUUID)();
        const timestamp = new Date().toISOString();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = 'INTERNAL_ERROR';
        let message = 'Something went wrong.';
        let details;
        if (exception instanceof app_error_1.AppError) {
            status = exception.status;
            code = exception.code;
            message = exception.message;
            details = exception.details;
        }
        else if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string') {
                message = body;
                code = 'HTTP_ERROR';
            }
            else if (typeof body === 'object' && body) {
                const obj = body;
                message = String(obj.message ?? message);
                code = String(obj.error ?? 'HTTP_ERROR');
                if (Array.isArray(obj.message)) {
                    details = { fieldErrors: obj.message };
                    message = 'Validation failed.';
                    code = 'VALIDATION_ERROR';
                }
            }
            if (status === common_1.HttpStatus.TOO_MANY_REQUESTS) {
                code = 'RATE_LIMITED';
                message = 'Too many requests. Please wait a moment.';
            }
        }
        const payload = {
            error: { code, message, details, requestId, timestamp },
        };
        console.error(`[${requestId}]`, exception);
        res.status(status).json(payload);
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map