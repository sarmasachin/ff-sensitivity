import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { SCREEN_SESSION_MAX_MS } from '../analytics/analytics-security';
import { assertUserId } from './users-security';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;
const TIMELINE_LIMIT = 80;

// --- Start: Users screen journey 7d (Sachin) ---
@Injectable()
export class UsersScreenJourneyService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userIdRaw: string, daysRaw?: string) {
    const userId = assertUserId(userIdRaw);
    const days = clampDays(daysRaw);
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) {
      throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
    }

    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [summaryRow, byScreen, timeline] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ total_ms: bigint; visits: bigint; screens: bigint }>
      >`
        SELECT
          COALESCE(SUM(
            CASE
              WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
              THEN LEAST((props_json->>'duration_ms')::bigint, ${SCREEN_SESSION_MAX_MS})
              ELSE 0
            END
          ), 0)::bigint AS total_ms,
          COUNT(*)::bigint AS visits,
          COUNT(DISTINCT props_json->>'screen')::bigint AS screens
        FROM app_analytics_events
        WHERE name = 'screen_session'
          AND user_id = ${userId}
          AND created_at >= ${since}
      `,
      this.prisma.$queryRaw<
        Array<{ screen: string; total_ms: bigint; visits: bigint }>
      >`
        SELECT
          props_json->>'screen' AS screen,
          SUM(
            CASE
              WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
              THEN LEAST((props_json->>'duration_ms')::bigint, ${SCREEN_SESSION_MAX_MS})
              ELSE 0
            END
          )::bigint AS total_ms,
          COUNT(*)::bigint AS visits
        FROM app_analytics_events
        WHERE name = 'screen_session'
          AND user_id = ${userId}
          AND created_at >= ${since}
          AND props_json->>'screen' ~ '^[a-z][a-z0-9_]{0,31}$'
        GROUP BY props_json->>'screen'
        ORDER BY total_ms DESC
        LIMIT 12
      `,
      this.prisma.$queryRaw<
        Array<{
          id: string;
          screen: string;
          duration_ms: bigint;
          created_at: Date;
        }>
      >`
        SELECT
          id,
          props_json->>'screen' AS screen,
          CASE
            WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
            THEN LEAST((props_json->>'duration_ms')::bigint, ${SCREEN_SESSION_MAX_MS})
            ELSE 0
          END AS duration_ms,
          created_at
        FROM app_analytics_events
        WHERE name = 'screen_session'
          AND user_id = ${userId}
          AND created_at >= ${since}
          AND props_json->>'screen' ~ '^[a-z][a-z0-9_]{0,31}$'
        ORDER BY created_at DESC
        LIMIT ${TIMELINE_LIMIT}
      `,
    ]);

    const summary = summaryRow[0];
    const totalMs = Number(summary?.total_ms ?? 0);
    const visits = Number(summary?.visits ?? 0);

    return {
      days,
      since: since.toISOString(),
      summary: {
        visits,
        totalSeconds: Math.round(totalMs / 1000),
        uniqueScreens: Number(summary?.screens ?? 0),
      },
      byScreen: byScreen.map((row) => ({
        screen: row.screen,
        visits: Number(row.visits),
        seconds: Math.round(Number(row.total_ms) / 1000),
      })),
      timeline: timeline.map((row) => {
        const durationMs = Number(row.duration_ms);
        return {
          id: row.id,
          screen: row.screen,
          durationMs,
          seconds: Math.round(durationMs / 1000),
          at: row.created_at.toISOString(),
        };
      }),
    };
  }
}

function clampDays(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.floor(n));
}
// --- End: Users screen journey 7d (Sachin) ---
