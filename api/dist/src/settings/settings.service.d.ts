import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type OpsSettingsBundle } from './settings-security';
export type StepUpKind = 'reveal' | 'staff' | 'wallet';
export declare class SettingsService implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    private readonly log;
    private purgeTimer;
    constructor(prisma: PrismaService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    ensureDefaults(): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        preferences: Prisma.JsonValue;
        session: Prisma.JsonValue;
        security: Prisma.JsonValue;
    }>;
    getBundle(): Promise<OpsSettingsBundle>;
    adminGet(): Promise<OpsSettingsBundle>;
    adminSave(actorAdminId: string, raw: unknown): Promise<OpsSettingsBundle>;
    purgeAuditLogs(actorAdminId: string | null, opts: {
        manual: boolean;
    }): Promise<{
        deleted: number;
        skipped: true;
        retentionDays: number;
        lastAuditPurgeAt: string | null;
    } | {
        deleted: number;
        skipped: false;
        retentionDays: number;
        lastAuditPurgeAt: string;
    }>;
    assertStepUp(adminId: string, currentPassword: string | undefined, kind: StepUpKind): Promise<void>;
}
