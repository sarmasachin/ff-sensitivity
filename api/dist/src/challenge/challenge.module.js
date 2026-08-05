"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const analytics_module_1 = require("../analytics/analytics.module");
const economy_module_1 = require("../economy/economy.module");
const challenge_admin_controller_1 = require("./challenge-admin.controller");
const challenge_controller_1 = require("./challenge.controller");
const challenge_module_guard_1 = require("./challenge-module.guard");
const challenge_service_1 = require("./challenge.service");
let ChallengeModule = class ChallengeModule {
};
exports.ChallengeModule = ChallengeModule;
exports.ChallengeModule = ChallengeModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, economy_module_1.EconomyModule, analytics_module_1.AnalyticsModule],
        controllers: [challenge_controller_1.ChallengeController, challenge_admin_controller_1.ChallengeAdminController],
        providers: [challenge_service_1.ChallengeService, challenge_module_guard_1.ChallengeModuleGuard],
        exports: [challenge_service_1.ChallengeService],
    })
], ChallengeModule);
//# sourceMappingURL=challenge.module.js.map