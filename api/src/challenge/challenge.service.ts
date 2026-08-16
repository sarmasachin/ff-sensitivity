import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveChallengeDto } from './dto/challenge.dto';
import {
  CONFIG_ID,
  DEFAULT_RULES,
  assertMilestoneList,
  assertQuizList,
  ensureChallengeDefaults,
  mapMilestone,
  mapQuizAdmin,
  mapRules,
  sanitizeId,
} from './challenge-shared';

@Injectable()
export class ChallengeService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults() {
    await ensureChallengeDefaults(this.prisma);
  }

  async adminGetBundle() {
    await ensureChallengeDefaults(this.prisma);
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
      rules: mapRules(config),
      quiz: quiz.map((q) => mapQuizAdmin(q)),
      milestones: milestones.map((m) => mapMilestone(m)),
    };
  }

  async adminSave(adminId: string, dto: SaveChallengeDto) {
    if (dto.quiz !== undefined) assertQuizList(dto.quiz);
    if (dto.milestones !== undefined) assertMilestoneList(dto.milestones);

    await this.prisma.$transaction(async (tx) => {
      await tx.challengeConfig.upsert({
        where: { id: CONFIG_ID },
        update: {
          missDayResetsStreak: dto.rules.missDayResetsStreak,
          requireCheckIn: dto.rules.requireCheckIn,
          requireQuiz: dto.rules.requireQuiz,
          adBonusOptional: dto.rules.adBonusOptional,
          adBonusCooldownHours: dto.rules.adBonusCooldownHours,
          scratchCardsPerDay: dto.rules.scratchCardsPerDay,
          cardExpiresSameDay: dto.rules.cardExpiresSameDay,
          firstMilestoneDays: dto.rules.firstMilestoneDays,
          wrongAnswerLockHours: dto.rules.wrongAnswerLockHours,
          wrongAnswerLockMinutes: dto.rules.wrongAnswerLockMinutes ?? 20,
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

      if (dto.quiz !== undefined) {
        await tx.challengeQuizQuestion.deleteMany({});
        if (dto.quiz.length) {
          await tx.challengeQuizQuestion.createMany({
            data: dto.quiz.map((q, i) => ({
              id: sanitizeId(q.id, `q_${i + 1}`),
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
      }

      if (dto.milestones !== undefined) {
        await tx.challengeMilestone.deleteMany({});
        if (dto.milestones.length) {
          await tx.challengeMilestone.createMany({
            data: dto.milestones.map((m) => ({
              id: sanitizeId(m.id, `m${m.days}`),
              days: m.days,
              title: m.title.trim(),
              rewardLabel: m.rewardLabel.trim(),
              coinReward: m.coinReward,
              badge: m.badge?.trim() ? m.badge.trim().slice(0, 80) : null,
              enabled: m.enabled,
            })),
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: 'challenge.save',
          entity: 'challenge_config:default',
          afterJson: {
            quizCount: dto.quiz?.length ?? null,
            milestoneCount: dto.milestones?.length ?? null,
            quizCorrectCoins: dto.rules.quizCorrectCoins,
            quizWrongCoins: dto.rules.quizWrongCoins,
          } as Prisma.InputJsonValue,
        },
      });
    });

    return this.adminGetBundle();
  }
}
