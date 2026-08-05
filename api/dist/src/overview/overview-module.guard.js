"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverviewModuleGuard = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
let OverviewModuleGuard = class OverviewModuleGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const admin = req.user;
        if (!admin) {
            throw new app_error_1.AppError('AUTH_REQUIRED', 'Sign in required.', 401);
        }
        return true;
    }
};
exports.OverviewModuleGuard = OverviewModuleGuard;
exports.OverviewModuleGuard = OverviewModuleGuard = __decorate([
    (0, common_1.Injectable)()
], OverviewModuleGuard);
//# sourceMappingURL=overview-module.guard.js.map