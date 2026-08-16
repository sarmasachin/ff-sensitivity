import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import type { MilestoneDto, QuizQuestionDto } from './dto/challenge.dto';

export const CONFIG_ID = 'default';

export const DEFAULT_RULES = {
  missDayResetsStreak: true,
  requireCheckIn: true,
  requireQuiz: true,
  adBonusOptional: true,
  adBonusCooldownHours: 4,
  scratchCardsPerDay: 1,
  cardExpiresSameDay: true,
  firstMilestoneDays: 7,
  wrongAnswerLockHours: 4,
  wrongAnswerLockMinutes: 20,
  quizOpenWindowHours: 2,
  quizCorrectCoins: 50,
  quizWrongCoins: -10,
  checkinCoins: 20,
  adBonusCoins: 30,
};

export async function ensureChallengeDefaults(prisma: PrismaService) {
  await prisma.challengeConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: { id: CONFIG_ID, ...DEFAULT_RULES },
  });
}

export function mapRules(c: {
  missDayResetsStreak: boolean;
  requireCheckIn: boolean;
  requireQuiz: boolean;
  adBonusOptional: boolean;
  adBonusCooldownHours: number;
  scratchCardsPerDay: number;
  cardExpiresSameDay: boolean;
  firstMilestoneDays: number;
  wrongAnswerLockHours: number;
  wrongAnswerLockMinutes?: number;
  quizOpenWindowHours: number;
  quizCorrectCoins: number;
  quizWrongCoins: number;
}) {
  return {
    missDayResetsStreak: c.missDayResetsStreak,
    requireCheckIn: c.requireCheckIn,
    requireQuiz: c.requireQuiz,
    adBonusOptional: c.adBonusOptional,
    adBonusCooldownHours: c.adBonusCooldownHours,
    scratchCardsPerDay: c.scratchCardsPerDay,
    cardExpiresSameDay: c.cardExpiresSameDay,
    firstMilestoneDays: c.firstMilestoneDays,
    wrongAnswerLockHours: c.wrongAnswerLockHours,
    wrongAnswerLockMinutes: c.wrongAnswerLockMinutes ?? 20,
    quizOpenWindowHours: c.quizOpenWindowHours,
    quizCorrectCoins: c.quizCorrectCoins,
    quizWrongCoins: c.quizWrongCoins,
  };
}

export function mapQuizAdmin(q: {
  id: string;
  question: string;
  option0: string;
  option1: string;
  option2: string;
  option3: string;
  correctIndex: number;
  enabled: boolean;
}) {
  return {
    id: q.id,
    question: q.question,
    options: [q.option0, q.option1, q.option2, q.option3] as [
      string,
      string,
      string,
      string,
    ],
    correctIndex: q.correctIndex,
    enabled: q.enabled,
  };
}

export function mapMilestone(m: {
  id: string;
  days: number;
  title: string;
  rewardLabel: string;
  coinReward: number;
  badge: string | null;
  enabled: boolean;
}) {
  return {
    id: m.id,
    days: m.days,
    title: m.title,
    rewardLabel: m.rewardLabel,
    coinReward: m.coinReward,
    badge: m.badge,
    enabled: m.enabled,
  };
}

export function sanitizeId(raw: string, fallback: string): string {
  const id = (raw?.trim() || fallback)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 64);
  if (!id || id.includes('/')) {
    throw new AppError('CHALLENGE_BAD_ID', 'Invalid id.', 400);
  }
  return id;
}

export function assertQuizList(quiz: QuizQuestionDto[]) {
  if (quiz.length > 1500) {
    throw new AppError('CHALLENGE_QUIZ_LIMIT', 'Too many questions (max 1500).', 400);
  }
  const ids = new Set<string>();
  for (const q of quiz) {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new AppError('CHALLENGE_BAD_OPTIONS', 'Each quiz needs 4 options.', 400);
    }
    if (q.options.some((o) => !o?.trim())) {
      throw new AppError('CHALLENGE_BAD_OPTIONS', 'Options cannot be blank.', 400);
    }
    const id = sanitizeId(q.id, 'q');
    if (ids.has(id)) {
      throw new AppError('CHALLENGE_DUP_QUIZ', `Duplicate quiz id: ${id}`, 400);
    }
    ids.add(id);
  }
}

export function assertMilestoneList(milestones: MilestoneDto[]) {
  if (milestones.length > 100) {
    throw new AppError('CHALLENGE_MS_LIMIT', 'Too many milestones.', 400);
  }
  const ids = new Set<string>();
  const days = new Set<number>();
  for (const m of milestones) {
    const id = sanitizeId(m.id, `m${m.days}`);
    if (ids.has(id)) {
      throw new AppError('CHALLENGE_DUP_MS', `Duplicate milestone id: ${id}`, 400);
    }
    if (days.has(m.days)) {
      throw new AppError(
        'CHALLENGE_DUP_DAYS',
        `Duplicate milestone day: ${m.days}`,
        400,
      );
    }
    ids.add(id);
    days.add(m.days);
  }
}

export async function auditChallenge(
  prisma: PrismaService,
  adminId: string,
  action: string,
  entity: string,
  afterJson: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: { actorAdminId: adminId, action, entity, afterJson },
  });
}

export function rethrowUnique(err: unknown, code: string, message: string): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    throw new AppError(code, message, 409);
  }
  throw err;
}

export function pickTodayQuestion<
  T extends { id: string },
>(rows: T[], dayIndex: number): T | null {
  if (!rows.length) return null;
  const index = ((dayIndex % rows.length) + rows.length) % rows.length;
  return rows[index] ?? null;
}

export function pickSecondChanceQuestion<T extends { id: string }>(
  rows: T[],
  todayId: string,
  userId: string,
  day: string,
): T | null {
  const pool = rows.filter((r) => r.id !== todayId);
  if (!pool.length) return null;
  let hash = 0;
  const seed = `${userId}:${day}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length] ?? null;
}

export function utcDayOfYear(d = new Date()): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

export function utcEpochDay(d = new Date()): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000,
  );
}
