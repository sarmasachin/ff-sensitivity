import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
// --- Start: Redeem live wire (Sachin) ---
import { UserAuthModule } from './user-auth/user-auth.module';
import { RedeemModule } from './redeem/redeem.module';
// --- End: Redeem live wire (Sachin) ---
// --- Start: Economy live wire (Sachin) ---
import { EconomyModule } from './economy/economy.module';
// --- End: Economy live wire (Sachin) ---
// --- Start: Shop live wire (Sachin) ---
import { ShopModule } from './shop/shop.module';
// --- End: Shop live wire (Sachin) ---
// --- Start: Community live wire (Sachin) ---
import { CommunityModule } from './community/community.module';
// --- End: Community live wire (Sachin) ---
// --- Start: Challenge live wire (Sachin) ---
import { ChallengeModule } from './challenge/challenge.module';
// --- End: Challenge live wire (Sachin) ---
// --- Start: Scratch live wire (Sachin) ---
import { ScratchModule } from './scratch/scratch.module';
// --- End: Scratch live wire (Sachin) ---
// --- Start: Names live wire (Sachin) ---
import { NamesModule } from './names/names.module';
// --- End: Names live wire (Sachin) ---
// --- Start: Support live wire (Sachin) ---
import { SupportModule } from './support/support.module';
// --- End: Support live wire (Sachin) ---
// --- Start: Promos live wire (Sachin) ---
import { PromosModule } from './promos/promos.module';
// --- End: Promos live wire (Sachin) ---
// --- Start: Push live wire (Sachin) ---
import { PushModule } from './push/push.module';
// --- End: Push live wire (Sachin) ---
// --- Start: App remote config live wire (Sachin) ---
import { AppConfigModule } from './app-config/app-config.module';
// --- End: App remote config live wire (Sachin) ---
// --- Start: Devices live wire (Sachin) ---
import { DevicesModule } from './devices/devices.module';
// --- End: Devices live wire (Sachin) ---
// --- Start: Wallets admin live wire (Sachin) ---
import { WalletsModule } from './wallets/wallets.module';
// --- End: Wallets admin live wire (Sachin) ---
// --- Start: Users admin live wire (Sachin) ---
import { UsersAdminModule } from './users/users.module';
// --- End: Users admin live wire (Sachin) ---
// --- Start: Copy CMS live wire (Sachin) ---
import { CopyModule } from './copy/copy.module';
// --- End: Copy CMS live wire (Sachin) ---
// --- Start: Staff admin live wire (Sachin) ---
import { StaffAdminModule } from './staff/staff.module';
// --- End: Staff admin live wire (Sachin) ---
// --- Start: Audit admin live wire (Sachin) ---
import { AuditAdminModule } from './audit/audit.module';
// --- End: Audit admin live wire (Sachin) ---
// --- Start: Overview KPIs live wire (Sachin) ---
import { OverviewAdminModule } from './overview/overview.module';
// --- End: Overview KPIs live wire (Sachin) ---
// --- Start: App analytics P1 live wire (Sachin) ---
import { AnalyticsModule } from './analytics/analytics.module';
// --- End: App analytics P1 live wire (Sachin) ---
// --- Start: Ops settings live wire (Sachin) ---
import { SettingsAdminModule } from './settings/settings.module';
// --- End: Ops settings live wire (Sachin) ---

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AuthModule,
    // --- Start: Redeem live wire (Sachin) ---
    UserAuthModule,
    RedeemModule,
    // --- End: Redeem live wire (Sachin) ---
    // --- Start: Economy live wire (Sachin) ---
    EconomyModule,
    // --- End: Economy live wire (Sachin) ---
    // --- Start: Shop live wire (Sachin) ---
    ShopModule,
    // --- End: Shop live wire (Sachin) ---
    // --- Start: Community live wire (Sachin) ---
    CommunityModule,
    // --- End: Community live wire (Sachin) ---
    // --- Start: Challenge live wire (Sachin) ---
    ChallengeModule,
    // --- End: Challenge live wire (Sachin) ---
    // --- Start: Scratch live wire (Sachin) ---
    ScratchModule,
    // --- End: Scratch live wire (Sachin) ---
    // --- Start: Names live wire (Sachin) ---
    NamesModule,
    // --- End: Names live wire (Sachin) ---
    // --- Start: Support live wire (Sachin) ---
    SupportModule,
    // --- End: Support live wire (Sachin) ---
    // --- Start: Promos live wire (Sachin) ---
    PromosModule,
    // --- End: Promos live wire (Sachin) ---
    // --- Start: Devices live wire (Sachin) ---
    DevicesModule,
    // --- End: Devices live wire (Sachin) ---
    // --- Start: Wallets admin live wire (Sachin) ---
    WalletsModule,
    // --- End: Wallets admin live wire (Sachin) ---
    // --- Start: Users admin live wire (Sachin) ---
    UsersAdminModule,
    // --- End: Users admin live wire (Sachin) ---
    // --- Start: Copy CMS live wire (Sachin) ---
    CopyModule,
    // --- End: Copy CMS live wire (Sachin) ---
    // --- Start: Staff admin live wire (Sachin) ---
    StaffAdminModule,
    // --- End: Staff admin live wire (Sachin) ---
    // --- Start: Audit admin live wire (Sachin) ---
    AuditAdminModule,
    // --- End: Audit admin live wire (Sachin) ---
    // --- Start: Overview KPIs live wire (Sachin) ---
    OverviewAdminModule,
    // --- End: Overview KPIs live wire (Sachin) ---
    // --- Start: App analytics P1 live wire (Sachin) ---
    AnalyticsModule,
    // --- End: App analytics P1 live wire (Sachin) ---
    // --- Start: Ops settings live wire (Sachin) ---
    SettingsAdminModule,
    // --- End: Ops settings live wire (Sachin) ---
    // --- Start: Push live wire (Sachin) ---
    PushModule,
    // --- End: Push live wire (Sachin) ---
    // --- Start: App remote config live wire (Sachin) ---
    AppConfigModule,
    // --- End: App remote config live wire (Sachin) ---
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
