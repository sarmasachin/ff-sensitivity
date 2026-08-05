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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitQuizDto = exports.SaveChallengeDto = exports.MilestoneDto = exports.QuizQuestionDto = exports.ChallengeRulesDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class ChallengeRulesDto {
    missDayResetsStreak;
    requireCheckIn;
    requireQuiz;
    adBonusOptional;
    scratchCardsPerDay;
    cardExpiresSameDay;
    firstMilestoneDays;
    wrongAnswerLockHours;
    quizOpenWindowHours;
    quizCorrectCoins;
    quizWrongCoins;
}
exports.ChallengeRulesDto = ChallengeRulesDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ChallengeRulesDto.prototype, "missDayResetsStreak", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ChallengeRulesDto.prototype, "requireCheckIn", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ChallengeRulesDto.prototype, "requireQuiz", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ChallengeRulesDto.prototype, "adBonusOptional", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(20),
    __metadata("design:type", Number)
], ChallengeRulesDto.prototype, "scratchCardsPerDay", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ChallengeRulesDto.prototype, "cardExpiresSameDay", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Number)
], ChallengeRulesDto.prototype, "firstMilestoneDays", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(72),
    __metadata("design:type", Number)
], ChallengeRulesDto.prototype, "wrongAnswerLockHours", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(48),
    __metadata("design:type", Number)
], ChallengeRulesDto.prototype, "quizOpenWindowHours", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(9999),
    __metadata("design:type", Number)
], ChallengeRulesDto.prototype, "quizCorrectCoins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(-9999),
    (0, class_validator_1.Max)(9999),
    __metadata("design:type", Number)
], ChallengeRulesDto.prototype, "quizWrongCoins", void 0);
class QuizQuestionDto {
    id;
    question;
    options;
    correctIndex;
    enabled;
}
exports.QuizQuestionDto = QuizQuestionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], QuizQuestionDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(400),
    __metadata("design:type", String)
], QuizQuestionDto.prototype, "question", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(4),
    (0, class_validator_1.ArrayMaxSize)(4),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], QuizQuestionDto.prototype, "options", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(3),
    __metadata("design:type", Number)
], QuizQuestionDto.prototype, "correctIndex", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], QuizQuestionDto.prototype, "enabled", void 0);
class MilestoneDto {
    id;
    days;
    title;
    rewardLabel;
    coinReward;
    badge;
    enabled;
}
exports.MilestoneDto = MilestoneDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], MilestoneDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Number)
], MilestoneDto.prototype, "days", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], MilestoneDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], MilestoneDto.prototype, "rewardLabel", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100_000),
    __metadata("design:type", Number)
], MilestoneDto.prototype, "coinReward", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", Object)
], MilestoneDto.prototype, "badge", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MilestoneDto.prototype, "enabled", void 0);
class SaveChallengeDto {
    rules;
    quiz;
    milestones;
}
exports.SaveChallengeDto = SaveChallengeDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ChallengeRulesDto),
    __metadata("design:type", ChallengeRulesDto)
], SaveChallengeDto.prototype, "rules", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => QuizQuestionDto),
    __metadata("design:type", Array)
], SaveChallengeDto.prototype, "quiz", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MilestoneDto),
    __metadata("design:type", Array)
], SaveChallengeDto.prototype, "milestones", void 0);
class SubmitQuizDto {
    questionId;
    selectedIndex;
}
exports.SubmitQuizDto = SubmitQuizDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], SubmitQuizDto.prototype, "questionId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(3),
    __metadata("design:type", Number)
], SubmitQuizDto.prototype, "selectedIndex", void 0);
//# sourceMappingURL=challenge.dto.js.map