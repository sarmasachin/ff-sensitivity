import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractIp,
  formatWhen,
  hoursAgo,
  humanAction,
  mapCategory,
  mapResult,
  maskEmail,
  summarizeDetail,
} from './audit-security';

// --- Start: Audit admin live wire (Sachin) ---
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  private toRow(
    row: {
      id: string;
      action: string;
      entity: string;
      beforeJson: Prisma.JsonValue | null;
      afterJson: Prisma.JsonValue | null;
      createdAt: Date;
      actor: {
        email: string;
        displayName: string | null;
      } | null;
    },
    now = new Date(),
  ) {
    const h = hoursAgo(row.createdAt, now);
    const actorEmail = row.actor?.email ?? 'system@ffops';
    const actorName =
      row.actor?.displayName?.trim() ||
      (row.actor ? actorEmail.split('@')[0] : 'system');
    return {
      id: row.id,
      atLabel: formatWhen(h),
      hoursAgo: Math.round(h * 10) / 10,
      actorName,
      actorEmail: row.actor ? maskEmail(actorEmail) : actorEmail,
      category: mapCategory(row.action),
      action: humanAction(row.action),
      target: row.entity || '—',
      result: mapResult(row.action, row.afterJson),
      ipLabel: extractIp(row.afterJson),
      detail: summarizeDetail(row.beforeJson, row.afterJson),
    };
  }

  async adminList(limit = 200) {
    const take = Math.min(500, Math.max(1, limit));
    const rows = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actor: { select: { email: true, displayName: true } },
      },
    });
    const now = new Date();
    return { events: rows.map((r) => this.toRow(r, now)) };
  }
}
// --- End: Audit admin live wire (Sachin) ---
