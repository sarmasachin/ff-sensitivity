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
var UsersPurgeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersPurgeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const users_purge_1 = require("./users-purge");
let UsersPurgeService = UsersPurgeService_1 = class UsersPurgeService {
    prisma;
    log = new common_1.Logger(UsersPurgeService_1.name);
    timer = null;
    constructor(prisma) {
        this.prisma = prisma;
    }
    onModuleInit() {
        void this.runOnce().catch((err) => {
            this.log.warn(`Deleted-user purge failed on boot: ${String(err)}`);
        });
        this.timer = setInterval(() => {
            void this.runOnce().catch((err) => {
                this.log.warn(`Deleted-user auto-purge failed: ${String(err)}`);
            });
        }, users_purge_1.DELETED_USER_PURGE_INTERVAL_MS);
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = null;
    }
    async runOnce() {
        const result = await (0, users_purge_1.purgeDeletedUsers)(this.prisma);
        if (result.purged > 0) {
            this.log.log(`Purged ${result.purged} soft-deleted user(s) older than cutoff ${result.cutoff}`);
        }
        return result;
    }
};
exports.UsersPurgeService = UsersPurgeService;
exports.UsersPurgeService = UsersPurgeService = UsersPurgeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersPurgeService);
//# sourceMappingURL=users-purge.service.js.map