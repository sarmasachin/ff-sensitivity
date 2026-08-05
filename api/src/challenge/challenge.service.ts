import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { EconomyService } from '../economy/economy.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { utcDateKey } from '../economy/economy-catalog';
import type {
  MilestoneDto,
  QuizQuestionDto,
  SaveChallengeDto,
} from './dto/challenge.dto';

// --- Start: Challenge live wire (Sachin) ---
const CONFIG_ID = 'default';

const DEFAULT_RULES = {
  missDayResetsStreak: true,
  requireCheckIn: true,
  requireQuiz: true,
  adBonusOptional: true,
  scratchCardsPerDay: 1,
  cardExpiresSameDay: true,
  firstMilestoneDays: 7,
  wrongAnswerLockHours: 4,
  quizOpenWindowHours: 2,
  quizCorrectCoins: 50,
  quizWrongCoins: -10,
  checkinCoins: 20,
  adBonusCoins: 30,
};

@Injectable()
export class ChallengeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economy: EconomyService,
    private readonly analytics: AnalyticsService,
  ) {}

  async ensureDefaults() {
    await this.prisma.challengeConfig.upsert({
      where: { id: CONFIG_ID },
      update: {},
      create: { id: CONFIG_ID, ...DEFAULT_RULES },
    });
  }

  async adminGetBundle() {
    await this.ensureDefaults();
    const [config, quiz, milestones] = await Promise.all([
      this.prisma.challengeConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
      this.prisma.challengeQuizQuestion.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.challengeMilestone.findMany({
        orderBy: { days: 'asc' },
      }),
    ]);
    return {
      rules: this.mapRules(config),
      quiz: quiz.map((q) => this.mapQuizAdmin(q)),
      milestones: milestones.map((m) => this.mapMilestone(m)),
    };
  }

  async adminSave(adminId: string, dto: SaveChallengeDto) {
    this.assertQuizList(dto.quiz);
    this.assertMilestoneList(dto.milestones);

    await this.prisma.$transaction(async (tx) => {
      await tx.challengeConfig.upsert({
        where: { id: CONFIG_ID },
        update: {
          missDayResetsStreak: dto.rules.missDayResetsStreak,
          requireCheckIn: dto.rules.requireCheckIn,
          requireQuiz: dto.rules.requireQuiz,
          adBonusOptional: dto.rules.adBonusOptional,
          scratchCardsPerDay: dto.rules.scratchCardsPerDay,
          cardExpiresSameDay: dto.rules.cardExpiresSameDay,
          firstMilestoneDays: dto.rules.firstMilestoneDays,
          wrongAnswerLockHours: dto.rules.wrongAnswerLockHours,
          quizOpenWindowHours: dto.rules.quizOpenWindowHours,
          quizCorrectCoins: dto.rules.quizCorrectCoins,
          quizWrongCoins: dto.rules.quizWrongCoins,
        },
        create: {
          id: CONFIG_ID,
          ...DEFAULT_RULES,
          ...dto.rules,
        },
      });

      await tx.challengeQuizQuestion.deleteMany({});
      if (dto.quiz.length) {
        await tx.challengeQuizQuestion.createMany({
          data: dto.quiz.map((q, i) => ({
            id: this.sanitizeId(q.id, `q_${i + 1}`),
            question: q.question.trim(),
            option0: q.options[0].trim(),
            option1: q.options[1].trim(),
            option2: q.options[2].trim(),
            option3: q.options[3].trim(),
            correctIndex: q.correctIndex,
            enabled: q.enabled,
            sortOrder: i,
          })),
        });
      }

      await tx.challengeMilestone.deleteMany({});
      if (dto.milestones.length) {
        await tx.challengeMilestone.createMany({
          data: dto.milestones.map((m) => ({
            id: this.sanitizeId(m.id, `m${m.days}`),
            days: m.days,
            title: m.title.trim(),
            rewardLabel: m.rewardLabel.trim(),
            coinReward: m.coinReward,
            badge: m.badge?.trim() ? m.badge.trim().slice(0, 80) : null,
            enabled: m.enabled,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: 'challenge.save',
          entity: 'challenge_config:default',
          afterJson: {
            quizCount: dto.quiz.length,
            milestoneCount: dto.milestones.length,
            quizCorrectCoins: dto.rules.quizCorrectCoins,
            quizWrongCoins: dto.rules.quizWrongCoins,
          } as Prisma.InputJsonValue,
        },
      });
    });

    return this.adminGetBundle();
  }

  /** Public: today's question (no correctIndex) + rules + milestones. */
  async userToday(userId: string) {
    await this.ensureDefaults();
    await this.economy.requireUserPublic(userId);

    const [config, enabledQuiz, milestones] = await Promise.all([
      this.prisma.challengeConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
      this.prisma.challengeQuizQuestion.findMany({
        where: { enabled: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.challengeMilestone.findMany({
        where: { enabled: true },
        orderBy: { days: 'asc' },
      }),
    ]);

    const dayOfYear = this.utcDayOfYear();
    const todayQ = this.pickTodayQuestion(enabledQuiz, dayOfYear);
    const day = utcDateKey();

    const alreadyCorrect = await this.prisma.walletLedger.findFirst({
      where: {
        userId,
        idempotencyKey: `earn:quiz:ok:${userId}:${day}`,
      },
      select: { id: true },
    });
    const wrongCount = await this.prisma.walletLedger.count({
      where: {
        userId,
        reason: 'earn:quiz:wrong',
        idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
      },
    });

    return {
      dayKey: day,
      dayOfYear,
      rules: this.mapRules(config),
      question: todayQ
        ? {
            id: todayQ.id,
            question: todayQ.question,
            options: [
              todayQ.option0,
              todayQ.option1,
              todayQ.option2,
              todayQ.option3,
            ],
          }
        : null,
      quizState: {
        alreadyCorrect: !!alreadyCorrect,
        wrongAttempts: wrongCount,
        maxWrongAttempts: 2,
      },
      milestones: milestones.map((m) => this.mapMilestone(m)),
    };
  }

  async userSubmitQuiz(
    userId: string,
    questionId: string,
    selectedIndex: number,
  ) {
    await this.ensureDefaults();
    const qid = questionId?.trim() ?? '';
    if (!qid || qid.length > 64 || qid.includes('/')) {
      throw new AppError('CHALLENGE_BAD_QUESTION', 'Invalid question id.', 400);
    }
    if (![0, 1, 2, 3].includes(selectedIndex)) {
      throw new AppError('CHALLENGE_BAD_OPTION', 'Invalid option index.', 400);
    }

    const enabledQuiz = await this.prisma.challengeQuizQuestion.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const todayQ = this.pickTodayQuestion(enabledQuiz, this.utcDayOfYear());
    if (!todayQ) {
      throw new AppError('CHALLENGE_NO_QUIZ', 'No quiz available today.', 409);
    }
    if (todayQ.id !== qid) {
      throw new AppError(
        'CHALLENGE_WRONG_QUESTION',
        'That is not today’s question.',
        409,
      );
    }

    const day = utcDateKey();
    const config = await this.prisma.challengeConfig.findUniqueOrThrow({
      where: { id: CONFIG_ID },
    });
    const lockMs = config.wrongAnswerLockHours * 60 * 60 * 1000;
    const openMs = config.quizOpenWindowHours * 60 * 60 * 1000;
    const now = Date.now();

    const alreadyCorrect = await this.prisma.walletLedger.findFirst({
      where: {
        userId,
        idempotencyKey: `earn:quiz:ok:${userId}:${day}`,
      },
      select: { id: true, balanceAfter: true, delta: true, reason: true },
    });
    if (alreadyCorrect) {
      throw new AppError(
        'CHALLENGE_ALREADY_DONE',
        'Quiz already answered correctly today.',
        409,
      );
    }

    const lastWrong = await this.prisma.walletLedger.findFirst({
      where: {
        userId,
        reason: 'earn:quiz:wrong',
        idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (lastWrong) {
      const lockUntil = lastWrong.createdAt.getTime() + lockMs;
      const openUntil = lockUntil + openMs;
      if (now < lockUntil) {
        throw new AppError(
          'CHALLENGE_QUIZ_LOCKED',
          'Quiz locked — wait for the countdown.',
          409,
        );
      }
      if (now > openUntil) {
        throw new AppError(
          'CHALLENGE_QUIZ_CLOSED',
          'Quiz closed for today.',
          409,
        );
      }
    }

    const correct = todayQ.correctIndex === selectedIndex;
    const earn = await this.economy.earnQuizGraded(userId, correct, {
      correctCoins: config.quizCorrectCoins,
      wrongCoins: config.quizWrongCoins,
    });

    this.analytics.trackSafe({
      name: 'challenge_quiz_submit',
      userId,
      props: { correct },
    });

    return {
      ...earn,
      correct,
      questionId: todayQ.id,
      selectedIndex,
      lockUntilMs: correct ? null : now + lockMs,
      openUntilMs: correct ? null : now + lockMs + openMs,
      wrongAnswerLockHours: config.wrongAnswerLockHours,
      quizOpenWindowHours: config.quizOpenWindowHours,
    };
  }

  private pickTodayQuestion<
    T extends { id: string; option0: string; option1: string; option2: string; option3: string; correctIndex: number; question: string },
  >(rows: T[], dayOfYear: number): T | null {
    if (!rows.length) return null;
    const index = ((dayOfYear - 1) % rows.length + rows.length) % rows.length;
    return rows[index] ?? null;
  }

  private utcDayOfYear(d = new Date()): number {
    const start = Date.UTC(d.getUTCFullYear(), 0, 0);
    const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return Math.floor((now - start) / 86_400_000);
  }

  private mapRules(c: {
    missDayResetsStreak: boolean;
    requireCheckIn: boolean;
    requireQuiz: boolean;
    adBonusOptional: boolean;
    scratchCardsPerDay: number;
    cardExpiresSameDay: boolean;
    firstMilestoneDays: number;
    wrongAnswerLockHours: number;
    quizOpenWindowHours: number;
    quizCorrectCoins: number;
    quizWrongCoins: number;
  }) {
    return {
      missDayResetsStreak: c.missDayResetsStreak,
      requireCheckIn: c.requireCheckIn,
      requireQuiz: c.requireQuiz,
      adBonusOptional: c.adBonusOptional,
      scratchCardsPerDay: c.scratchCardsPerDay,
      cardExpiresSameDay: c.cardExpiresSameDay,
      firstMilestoneDays: c.firstMilestoneDays,
      wrongAnswerLockHours: c.wrongAnswerLockHours,
      quizOpenWindowHours: c.quizOpenWindowHours,
      quizCorrectCoins: c.quizCorrectCoins,
      quizWrongCoins: c.quizWrongCoins,
    };
  }

  private mapQuizAdmin(q: {
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

  private mapMilestone(m: {
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

  private sanitizeId(raw: string, fallback: string): string {
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

  private assertQuizList(quiz: QuizQuestionDto[]) {
    if (quiz.length > 200) {
      throw new AppError('CHALLENGE_QUIZ_LIMIT', 'Too many questions.', 400);
    }
    const ids = new Set<string>();
    for (const q of quiz) {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new AppError('CHALLENGE_BAD_OPTIONS', 'Each quiz needs 4 options.', 400);
      }
      if (q.options.some((o) => !o?.trim())) {
        throw new AppError('CHALLENGE_BAD_OPTIONS', 'Options cannot be blank.', 400);
      }
      const id = this.sanitizeId(q.id, 'q');
      if (ids.has(id)) {
        throw new AppError('CHALLENGE_DUP_QUIZ', `Duplicate quiz id: ${id}`, 400);
      }
      ids.add(id);
    }
  }

  private assertMilestoneList(milestones: MilestoneDto[]) {
    if (milestones.length > 100) {
      throw new AppError('CHALLENGE_MS_LIMIT', 'Too many milestones.', 400);
    }
    const ids = new Set<string>();
    const days = new Set<number>();
    for (const m of milestones) {
      const id = this.sanitizeId(m.id, `m${m.days}`);
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
}
// --- End: Challenge live wire (Sachin) ---
