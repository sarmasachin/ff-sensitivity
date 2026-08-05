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
exports.ChallengeController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const user_jwt_auth_guard_1 = require("../user-auth/user-jwt-auth.guard");
const current_user_decorator_1 = require("../user-auth/current-user.decorator");
const challenge_service_1 = require("./challenge.service");
const challenge_dto_1 = require("./dto/challenge.dto");
let ChallengeController = class ChallengeController {
    challenge;
    constructor(challenge) {
        this.challenge = challenge;
    }
    today(user) {
        return this.challenge.userToday(user.id);
    }
    submitQuiz(user, dto) {
        return this.challenge.userSubmitQuiz(user.id, dto.questionId, dto.selectedIndex);
    }
};
exports.ChallengeController = ChallengeController;
__decorate([
    (0, common_1.Get)('today'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChallengeController.prototype, "today", null);
__decorate([
    (0, common_1.Post)('quiz/submit'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, challenge_dto_1.SubmitQuizDto]),
    __metadata("design:returntype", void 0)
], ChallengeController.prototype, "submitQuiz", null);
exports.ChallengeController = ChallengeController = __decorate([
    (0, common_1.Controller)('api/v1/challenge'),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __metadata("design:paramtypes", [challenge_service_1.ChallengeService])
], ChallengeController);
//# sourceMappingURL=challenge.controller.js.map