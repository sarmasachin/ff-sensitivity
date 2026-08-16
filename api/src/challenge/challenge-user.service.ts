import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { EconomyService } from '../economy/economy.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { utcDateKey } from '../economy/economy-catalog';
import {
  CONFIG_ID,
  ensureChallengeDefaults,
  mapMilestone,
  mapRules,
  pickSecondChanceQuestion,
  pickTodayQuestion,
  utcDayOfYear,
  utcEpochDay,
} from './challenge-shared';

@Injectable()
export class ChallengeUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economy: EconomyService,
    private readonly analytics: AnalyticsService,
  ) {}

  async today(userId: string) {
    await ensureChallengeDefaults(this.prisma);
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

    const todayQ = pickTodayQuestion(enabledQuiz, utcEpochDay());
    const day = utcDateKey();
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { streakDays: true },
    });

    const [alreadyCorrect, wrongCount, lastWrong, checkinDone, lastAd, milestoneRows] =
      await Promise.all([
        this.prisma.walletLedger.findFirst({
          where: { userId, idempotencyKey: `earn:quiz:ok:${userId}:${day}` },
          select: { id: true },
        }),
        this.prisma.walletLedger.count({
          where: {
            userId,
            reason: 'earn:quiz:wrong',
            idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
          },
        }),
        this.prisma.walletLedger.findFirst({
          where: {
            userId,
            reason: 'earn:quiz:wrong',
            idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        this.prisma.walletLedger.findFirst({
          where: { userId, idempotencyKey: `earn:checkin:${userId}:${day}` },
          select: { id: true },
        }),
        this.prisma.walletLedger.findFirst({
          where: { userId, reason: 'earn:ad' },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        this.prisma.walletLedger.findMany({
          where: { userId, reason: { startsWith: 'earn:milestone:' } },
          select: { reason: true },
        }),
      ]);

    const lockMs =
      Math.max(1, (config as { wrongAnswerLockMinutes?: number }).wrongAnswerLockMinutes ?? 20) *
      60 *
      1000;
    let lockUntilMs: number | null = null;
    let secondChanceReady = false;
    let secondChanceUnlocked = false;
    let secondChanceQuestion: {
      id: string;
      question: string;
      options: [string, string, string, string];
    } | null = null;

    const secondRow = await this.prisma.walletLedger.findFirst({
      where: { userId, idempotencyKey: `quiz:second:${userId}:${day}` },
      select: { reason: true },
    });
    if (secondRow?.reason?.startsWith('quiz:second:')) {
      secondChanceUnlocked = true;
      const scId = secondRow.reason.slice('quiz:second:'.length);
      const scQ = enabledQuiz.find((q) => q.id === scId);
      if (scQ) {
        secondChanceQuestion = {
          id: scQ.id,
          question: scQ.question,
          options: [scQ.option0, scQ.option1, scQ.option2, scQ.option3],
        };
      }
    }

    if (lastWrong && !alreadyCorrect) {
      lockUntilMs = lastWrong.createdAt.getTime() + lockMs;
      if (Date.now() >= lockUntilMs && !secondChanceUnlocked) {
        secondChanceReady = true;
      }
    }

    const adCooldownMs = Math.max(1, config.adBonusCooldownHours) * 60 * 60 * 1000;
    let nextAdAvailableAtMs: number | null = null;
    let adAvailable = !!config.adBonusOptional;
    if (adAvailable && lastAd) {
      const nextAt = lastAd.createdAt.getTime() + adCooldownMs;
      if (Date.now() < nextAt) {
        adAvailable = false;
        nextAdAvailableAtMs = nextAt;
      }
    }

    const claimedMilestoneDays = milestoneRows
      .map((row) => Number.parseInt(row.reason.split(':')[2] ?? '', 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    const activeQuestion = secondChanceQuestion
      ? secondChanceQuestion
      : todayQ
        ? {
            id: todayQ.id,
            question: todayQ.question,
            options: [
              todayQ.option0,
              todayQ.option1,
              todayQ.option2,
              todayQ.option3,
            ] as [string, string, string, string],
          }
        : null;

    return {
      dayKey: day,
      dayOfYear: utcDayOfYear(),
      streakDays: user.streakDays,
      checkinDone: !!checkinDone,
      adDone: !adAvailable && !!config.adBonusOptional,
      adAvailable,
      nextAdAvailableAtMs,
      claimedMilestoneDays,
      rules: mapRules(config),
      question: activeQuestion,
      quizState: {
        alreadyCorrect: !!alreadyCorrect,
        wrongAttempts: wrongCount,
        maxWrongAttempts: 2,
        lockUntilMs,
        openUntilMs: null,
        secondChanceReady,
        secondChanceUnlocked,
      },
      milestones: milestones.map((m) => mapMilestone(m)),
    };
  }

  async submitQuiz(userId: string, questionId: string, selectedIndex: number) {
    await ensureChallengeDefaults(this.prisma);
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
    const todayQ = pickTodayQuestion(enabledQuiz, utcEpochDay());
    if (!todayQ) {
      throw new AppError('CHALLENGE_NO_QUIZ', 'No quiz available today.', 409);
    }

    const day = utcDateKey();
    const config = await this.prisma.challengeConfig.findUniqueOrThrow({
      where: { id: CONFIG_ID },
    });
    const lockMs =
      Math.max(1, (config as { wrongAnswerLockMinutes?: number }).wrongAnswerLockMinutes ?? 20) *
      60 *
      1000;
    const now = Date.now();

    const alreadyCorrect = await this.prisma.walletLedger.findFirst({
      where: { userId, idempotencyKey: `earn:quiz:ok:${userId}:${day}` },
      select: { id: true },
    });
    if (alreadyCorrect) {
      throw new AppError(
        'CHALLENGE_ALREADY_DONE',
        'Quiz already answered correctly today.',
        409,
      );
    }

    const secondRow = await this.prisma.walletLedger.findFirst({
      where: { userId, idempotencyKey: `quiz:second:${userId}:${day}` },
      select: { reason: true },
    });
    const secondQid = secondRow?.reason?.startsWith('quiz:second:')
      ? secondRow.reason.slice('quiz:second:'.length)
      : null;
    const activeQ = secondQid
      ? enabledQuiz.find((q) => q.id === secondQid)
      : todayQ;
    if (!activeQ) {
      throw new AppError('CHALLENGE_NO_QUIZ', 'No quiz available today.', 409);
    }
    if (activeQ.id !== qid) {
      throw new AppError(
        'CHALLENGE_WRONG_QUESTION',
        secondQid
          ? 'That is not your second-chance question.'
          : 'That is not today’s question.',
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
    if (lastWrong && !secondQid) {
      const lockUntil = lastWrong.createdAt.getTime() + lockMs;
      if (now < lockUntil) {
        throw new AppError(
          'CHALLENGE_QUIZ_LOCKED',
          'Quiz locked — wait for the countdown.',
          409,
        );
      }
      throw new AppError(
        'CHALLENGE_NEED_SECOND_CHANCE',
        'Watch a rewarded ad to unlock a new question.',
        409,
      );
    }

    const correct = activeQ.correctIndex === selectedIndex;
    const earn = await this.economy.earnQuizGraded(userId, correct, {
      correctCoins: config.quizCorrectCoins,
      wrongCoins: config.quizWrongCoins,
    });
    this.analytics.trackSafe({
      name: 'challenge_quiz_submit',
      userId,
      props: { correct, secondChance: !!secondQid },
    });
    return {
      ...earn,
      correct,
      questionId: activeQ.id,
      selectedIndex,
      lockUntilMs: correct || secondQid ? null : now + lockMs,
      openUntilMs: null,
      secondChanceReady: false,
      wrongAnswerLockMinutes:
        (config as { wrongAnswerLockMinutes?: number }).wrongAnswerLockMinutes ?? 20,
    };
  }

  async unlockSecondChance(userId: string) {
    await ensureChallengeDefaults(this.prisma);
    await this.economy.requireUserPublic(userId);
    const day = utcDateKey();
    const config = await this.prisma.challengeConfig.findUniqueOrThrow({
      where: { id: CONFIG_ID },
    });
    const lockMs =
      Math.max(1, (config as { wrongAnswerLockMinutes?: number }).wrongAnswerLockMinutes ?? 20) *
      60 *
      1000;

    const alreadyCorrect = await this.prisma.walletLedger.findFirst({
      where: { userId, idempotencyKey: `earn:quiz:ok:${userId}:${day}` },
      select: { id: true },
    });
    if (alreadyCorrect) {
      throw new AppError(
        'CHALLENGE_ALREADY_DONE',
        'Quiz already answered correctly today.',
        409,
      );
    }

    const existing = await this.prisma.walletLedger.findFirst({
      where: { userId, idempotencyKey: `quiz:second:${userId}:${day}` },
      select: { reason: true },
    });
    const enabledQuiz = await this.prisma.challengeQuizQuestion.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const todayQ = pickTodayQuestion(enabledQuiz, utcEpochDay());
    if (!todayQ) {
      throw new AppError('CHALLENGE_NO_QUIZ', 'No quiz available today.', 409);
    }

    if (existing?.reason?.startsWith('quiz:second:')) {
      const scId = existing.reason.slice('quiz:second:'.length);
      const scQ = enabledQuiz.find((q) => q.id === scId);
      if (!scQ) {
        throw new AppError('CHALLENGE_NO_QUIZ', 'Second-chance question missing.', 409);
      }
      return {
        alreadyUnlocked: true,
        question: {
          id: scQ.id,
          question: scQ.question,
          options: [scQ.option0, scQ.option1, scQ.option2, scQ.option3],
        },
      };
    }

    const lastWrong = await this.prisma.walletLedger.findFirst({
      where: {
        userId,
        reason: 'earn:quiz:wrong',
        idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastWrong) {
      throw new AppError(
        'CHALLENGE_NO_WRONG',
        'Second chance is only for wrong answers.',
        409,
      );
    }
    const lockUntil = lastWrong.createdAt.getTime() + lockMs;
    if (Date.now() < lockUntil) {
      throw new AppError(
        'CHALLENGE_QUIZ_LOCKED',
        'Wait for the lock countdown, then watch the ad.',
        409,
        { lockUntilMs: lockUntil },
      );
    }

    const nextQ = pickSecondChanceQuestion(enabledQuiz, todayQ.id, userId, day);
    if (!nextQ) {
      throw new AppError(
        'CHALLENGE_NO_SECOND_Q',
        'No alternate question available in the bank.',
        409,
      );
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.prisma.walletLedger.create({
      data: {
        userId,
        delta: 0,
        balanceAfter: user.coins,
        reason: `quiz:second:${nextQ.id}`,
        idempotencyKey: `quiz:second:${userId}:${day}`,
      },
    });
    this.analytics.trackSafe({
      name: 'challenge_quiz_second_chance',
      userId,
      props: { questionId: nextQ.id },
    });
    return {
      alreadyUnlocked: false,
      question: {
        id: nextQ.id,
        question: nextQ.question,
        options: [nextQ.option0, nextQ.option1, nextQ.option2, nextQ.option3],
      },
    };
  }
}
