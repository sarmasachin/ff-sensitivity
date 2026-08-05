"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportModuleGuard = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
let SupportModuleGuard = class SupportModuleGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const admin = req.user;
        if (!admin) {
            throw new app_error_1.AppError('AUTH_REQUIRED', 'Sign in required.', 401);
        }
        if (admin.role === client_1.AdminRole.SUPER_ADMIN) {
            return true;
        }
        if (!admin.allowedModules?.includes(client_1.AdminModule.support)) {
            throw new app_error_1.AppError('FORBIDDEN_MODULE', 'You do not have access to Support.', 403);
        }
        return true;
    }
};
exports.SupportModuleGuard = SupportModuleGuard;
exports.SupportModuleGuard = SupportModuleGuard = __decorate([
    (0, common_1.Injectable)()
], SupportModuleGuard);
//# sourceMappingURL=support-module.guard.js.map