import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { SaveCompareDto } from './dto/compare.dto';

const LIST_LIMIT = 50;
const DAILY_LIMIT = 30;

@Injectable()
export class CompareService {
  constructor(private readonly prisma: PrismaService) {}

  async list(fingersRaw?: string, roleRaw?: string) {
    const fingers = cleanFilter(fingersRaw);
    const role = cleanFilter(roleRaw);
    const [matched, everyone, items] = await Promise.all([
      fingers && role ? this.sumOffset(fingers, role) : Promise.resolve({ sum: 0, n: 0 }),
      this.sumOffset(),
      this.prisma.sensitivityCompare.findMany({
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
        include: { user: { select: { displayName: true } } },
      }),
    ]);
    const use = matched.n > 0 ? matched : everyone;
    return {
      offsetFrom: matched.n > 0 ? 'match' : 'all',
      averageGeneralOffset: use.n === 0 ? null : Math.trunc(use.sum / use.n),
      items: items.map((row) => ({
        id: row.id,
        displayName: row.user.displayName.trim() || 'Player',
        deviceLabel: row.deviceLabel,
        fingers: row.fingers,
        role: row.role,
        dpiPreference: row.dpiPreference,
        screenGuard: row.screenGuard,
        feedback: row.feedback,
        suggested: values(row, 'suggested'),
        actual: values(row, 'actual'),
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async save(userId: string, dto: SaveCompareDto) {
    const deviceLabel = dto.deviceLabel.trim();
    const fingers = dto.fingers.trim();
    const role = dto.role.trim();
    const dpiPreference = dto.dpiPreference.trim();
    const screenGuard = dto.screenGuard.trim();
    if (!deviceLabel || !fingers || !role || !dpiPreference || !screenGuard) {
      throw new AppError('COMPARE_INVALID', 'Enter the comparison details.', 400);
    }
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true },
      });
      if (!user || !user.isActive) {
        throw new AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
      }
      const today = await tx.sensitivityCompare.count({
        where: { userId, createdAt: { gte: start } },
      });
      if (today >= DAILY_LIMIT) {
        throw new AppError(
          'COMPARE_DAILY_LIMIT',
          'You can save 30 comparisons a day. Try again tomorrow.',
          429,
        );
      }
      return tx.sensitivityCompare.create({
        data: {
          userId,
          deviceLabel,
          fingers,
          role,
          dpiPreference,
          screenGuard,
          feedback: dto.feedback,
          suggestedGeneral: dto.suggested.general,
          suggestedRedDot: dto.suggested.redDot,
          suggestedScope2x: dto.suggested.scope2x,
          suggestedScope4x: dto.suggested.scope4x,
          suggestedSniper: dto.suggested.sniper,
          suggestedFreeLook: dto.suggested.freeLook,
          suggestedFireButton: dto.suggested.fireButton,
          actualGeneral: dto.actual.general,
          actualRedDot: dto.actual.redDot,
          actualScope2x: dto.actual.scope2x,
          actualScope4x: dto.actual.scope4x,
          actualSniper: dto.actual.sniper,
          actualFreeLook: dto.actual.freeLook,
          actualFireButton: dto.actual.fireButton,
        },
      });
    });
    return { id: row.id, createdAt: row.createdAt.toISOString() };
  }

  private async sumOffset(fingers?: string, role?: string) {
    const rows =
      fingers && role
        ? await this.prisma.$queryRaw<Array<{ sum: number; n: number }>>`
            SELECT COALESCE(SUM(actual_general - suggested_general), 0)::int AS sum,
                   COUNT(*)::int AS n
            FROM sensitivity_compares
            WHERE fingers = ${fingers} AND role = ${role}`
        : await this.prisma.$queryRaw<Array<{ sum: number; n: number }>>`
            SELECT COALESCE(SUM(actual_general - suggested_general), 0)::int AS sum,
                   COUNT(*)::int AS n
            FROM sensitivity_compares`;
    const row = rows[0] ?? { sum: 0, n: 0 };
    return { sum: Number(row.sum), n: Number(row.n) };
  }
}

function cleanFilter(raw?: string) {
  const value = String(raw ?? '').trim();
  if (!value || value.length > 40) return '';
  return value;
}

function values(
  row: {
    suggestedGeneral: number;
    suggestedRedDot: number;
    suggestedScope2x: number;
    suggestedScope4x: number;
    suggestedSniper: number;
    suggestedFreeLook: number;
    suggestedFireButton: number;
    actualGeneral: number;
    actualRedDot: number;
    actualScope2x: number;
    actualScope4x: number;
    actualSniper: number;
    actualFreeLook: number;
    actualFireButton: number;
  },
  side: 'suggested' | 'actual',
) {
  if (side === 'suggested') {
    return {
      general: row.suggestedGeneral,
      redDot: row.suggestedRedDot,
      scope2x: row.suggestedScope2x,
      scope4x: row.suggestedScope4x,
      sniper: row.suggestedSniper,
      freeLook: row.suggestedFreeLook,
      fireButton: row.suggestedFireButton,
    };
  }
  return {
    general: row.actualGeneral,
    redDot: row.actualRedDot,
    scope2x: row.actualScope2x,
    scope4x: row.actualScope4x,
    sniper: row.actualSniper,
    freeLook: row.actualFreeLook,
    fireButton: row.actualFireButton,
  };
}
