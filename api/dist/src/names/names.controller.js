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
exports.NamesController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const names_service_1 = require("./names.service");
let NamesController = class NamesController {
    names;
    constructor(names) {
        this.names = names;
    }
    catalog() {
        return this.names.userCatalog();
    }
};
exports.NamesController = NamesController;
__decorate([
    (0, common_1.Get)('catalog'),
    (0, throttler_1.Throttle)({ default: { limit: 90, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NamesController.prototype, "catalog", null);
exports.NamesController = NamesController = __decorate([
    (0, common_1.Controller)('api/v1/names'),
    __metadata("design:paramtypes", [names_service_1.NamesService])
], NamesController);
//# sourceMappingURL=names.controller.js.map