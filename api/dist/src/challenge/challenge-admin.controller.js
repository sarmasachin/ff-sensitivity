"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_admin_decorator_1 = require("../auth/current-admin.decorator");
const challenge_module_guard_1 = require("./challenge-module.guard");
const challenge_service_1 = require("./challenge.service");
const challenge_admin_items_service_1 = require("./challenge-admin-items.service");
const challenge_dto_1 = require("./dto/challenge.dto");
let ChallengeAdminController = class ChallengeAdminController {
    challenge;
    items;
    constructor(challenge, items) {
        this.challenge = challenge;
        this.items = items;
    }
    get() {
        return this.challenge.adminGetBundle();
    }
    save(admin, dto) {
        return this.challenge.adminSave(admin.id, dto);
    }
    createQuiz(admin, dto) {
        return this.items.createQuiz(admin.id, dto);
    }
    updateQuiz(admin, id, dto) {
        return this.items.updateQuiz(admin.id, id, dto);
    }
    deleteQuiz(admin, id) {
        return this.items.deleteQuiz(admin.id, id);
    }
    createMilestone(admin, dto) {
        return this.items.createMilestone(admin.id, dto);
    }
    updateMilestone(admin, id, dto) {
        return this.items.updateMilestone(admin.id, id, dto);
    }
    deleteMilestone(admin, id) {
        return this.items.deleteMilestone(admin.id, id);
    }
};
exports.ChallengeAdminController = ChallengeAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChallengeAdminController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, challenge_dto_1.SaveChallengeDto]),
    __metadata("design:returntype", void 0)
], ChallengeAdminController.prototype, "save", null);
__decorate([
    (0, common_1.Post)('quiz'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, challenge_dto_1.QuizQuestionDto]),
    __metadata("design:returntype", void 0)
], ChallengeAdminController.prototype, "createQuiz", null);
__decorate([
    (0, common_1.Put)('quiz/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, challenge_dto_1.QuizQuestionDto]),
    __metadata("design:returntype", void 0)
], ChallengeAdminController.prototype, "updateQuiz", null);
__decorate([
    (0, common_1.Delete)('quiz/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ChallengeAdminController.prototype, "deleteQuiz", null);
__decorate([
    (0, common_1.Post)('milestones'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, challenge_dto_1.MilestoneDto]),
    __metadata("design:returntype", void 0)
], ChallengeAdminController.prototype, "createMilestone", null);
__decorate([
    (0, common_1.Put)('milestones/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, challenge_dto_1.MilestoneDto]),
    __metadata("design:returntype", void 0)
], ChallengeAdminController.prototype, "updateMilestone", null);
__decorate([
    (0, common_1.Delete)('milestones/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ChallengeAdminController.prototype, "deleteMilestone", null);
exports.ChallengeAdminController = ChallengeAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/challenge'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, challenge_module_guard_1.ChallengeModuleGuard),
    __metadata("design:paramtypes", [challenge_service_1.ChallengeService,
        challenge_admin_items_service_1.ChallengeAdminItemsService])
], ChallengeAdminController);
//# sourceMappingURL=challenge-admin.controller.js.map