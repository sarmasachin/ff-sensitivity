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
exports.NamesAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_admin_decorator_1 = require("../auth/current-admin.decorator");
const names_module_guard_1 = require("./names-module.guard");
const names_service_1 = require("./names.service");
const names_admin_items_service_1 = require("./names-admin-items.service");
const names_dto_1 = require("./dto/names.dto");
let NamesAdminController = class NamesAdminController {
    names;
    items;
    constructor(names, items) {
        this.names = names;
        this.items = items;
    }
    get() {
        return this.names.adminGetBundle();
    }
    save(admin, dto) {
        return this.names.adminSave(admin.id, dto);
    }
    createFrame(admin, dto) {
        return this.items.createFrame(admin.id, dto);
    }
    updateFrame(admin, id, dto) {
        return this.items.updateFrame(admin.id, id, dto);
    }
    deleteFrame(admin, id) {
        return this.items.deleteFrame(admin.id, id);
    }
    updateFont(admin, id, dto) {
        return this.items.updateFont(admin.id, id, dto);
    }
};
exports.NamesAdminController = NamesAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NamesAdminController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, names_dto_1.SaveNamesDto]),
    __metadata("design:returntype", void 0)
], NamesAdminController.prototype, "save", null);
__decorate([
    (0, common_1.Post)('frames'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, names_dto_1.NameFrameDto]),
    __metadata("design:returntype", void 0)
], NamesAdminController.prototype, "createFrame", null);
__decorate([
    (0, common_1.Put)('frames/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, names_dto_1.NameFrameDto]),
    __metadata("design:returntype", void 0)
], NamesAdminController.prototype, "updateFrame", null);
__decorate([
    (0, common_1.Delete)('frames/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NamesAdminController.prototype, "deleteFrame", null);
__decorate([
    (0, common_1.Put)('fonts/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, names_dto_1.NameFontDto]),
    __metadata("design:returntype", void 0)
], NamesAdminController.prototype, "updateFont", null);
exports.NamesAdminController = NamesAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/names'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, names_module_guard_1.NamesModuleGuard),
    __metadata("design:paramtypes", [names_service_1.NamesService,
        names_admin_items_service_1.NamesAdminItemsService])
], NamesAdminController);
//# sourceMappingURL=names-admin.controller.js.map