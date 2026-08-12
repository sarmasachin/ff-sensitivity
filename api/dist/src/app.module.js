"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./auth/auth.module");
const prisma_module_1 = require("./prisma/prisma.module");
const request_id_middleware_1 = require("./common/middleware/request-id.middleware");
const user_auth_module_1 = require("./user-auth/user-auth.module");
const redeem_module_1 = require("./redeem/redeem.module");
const economy_module_1 = require("./economy/economy.module");
const shop_module_1 = require("./shop/shop.module");
const community_module_1 = require("./community/community.module");
const challenge_module_1 = require("./challenge/challenge.module");
const scratch_module_1 = require("./scratch/scratch.module");
const names_module_1 = require("./names/names.module");
const support_module_1 = require("./support/support.module");
const promos_module_1 = require("./promos/promos.module");
const push_module_1 = require("./push/push.module");
const app_config_module_1 = require("./app-config/app-config.module");
const devices_module_1 = require("./devices/devices.module");
const wallets_module_1 = require("./wallets/wallets.module");
const users_module_1 = require("./users/users.module");
const copy_module_1 = require("./copy/copy.module");
const staff_module_1 = require("./staff/staff.module");
const audit_module_1 = require("./audit/audit.module");
const overview_module_1 = require("./overview/overview.module");
const analytics_module_1 = require("./analytics/analytics.module");
const settings_module_1 = require("./settings/settings.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_id_middleware_1.RequestIdMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'default',
                    ttl: 60_000,
                    limit: 120,
                },
            ]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            user_auth_module_1.UserAuthModule,
            redeem_module_1.RedeemModule,
            economy_module_1.EconomyModule,
            shop_module_1.ShopModule,
            community_module_1.CommunityModule,
            challenge_module_1.ChallengeModule,
            scratch_module_1.ScratchModule,
            names_module_1.NamesModule,
            support_module_1.SupportModule,
            promos_module_1.PromosModule,
            devices_module_1.DevicesModule,
            wallets_module_1.WalletsModule,
            users_module_1.UsersAdminModule,
            copy_module_1.CopyModule,
            staff_module_1.StaffAdminModule,
            audit_module_1.AuditAdminModule,
            overview_module_1.OverviewAdminModule,
            analytics_module_1.AnalyticsModule,
            settings_module_1.SettingsAdminModule,
            push_module_1.PushModule,
            app_config_module_1.AppConfigModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map