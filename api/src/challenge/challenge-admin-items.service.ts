import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import type { MilestoneDto, QuizQuestionDto } from './dto/challenge.dto';
import {
  assertMilestoneList,
  assertQuizList,
  auditChallenge,
  mapMilestone,
  mapQuizAdmin,
  rethrowUnique,
  sanitizeId,
} from './challenge-shared';

@Injectable()
export class ChallengeAdminItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async createQuiz(adminId: string, dto: QuizQuestionDto) {
    assertQuizList([dto]);
    const count = await this.prisma.challengeQuizQuestion.count();
    if (count >= 1500) {
      throw new AppError(
        'CHALLENGE_QUIZ_LIMIT',
        'Too many questions (max 1500).',
        400,
      );
    }
    const id = sanitizeId(dto.id, 'q');
    const first = await this.prisma.challengeQuizQuestion.findFirst({
      orderBy: { sortOrder: 'asc' },
      select: { sortOrder: true },
    });
    try {
      const row = await this.prisma.challengeQuizQuestion.create({
        data: {
          id,
          question: dto.question.trim(),
          option0: dto.options[0].trim(),
          option1: dto.options[1].trim(),
          option2: dto.options[2].trim(),
          option3: dto.options[3].trim(),
          correctIndex: dto.correctIndex,
          enabled: dto.enabled,
          sortOrder: (first?.sortOrder ?? 0) - 1,
        },
      });
      await auditChallenge(this.prisma, adminId, 'challenge.quiz.create', `quiz:${id}`, {
        id,
        question: row.question,
      });
      return mapQuizAdmin(row);
    } catch (e) {
      rethrowUnique(e, 'CHALLENGE_DUP_QUIZ', `Question id already exists: ${id}`);
    }
  }

  async updateQuiz(adminId: string, rawId: string, dto: QuizQuestionDto) {
    assertQuizList([dto]);
    const id = sanitizeId(rawId, 'q');
    const existing = await this.prisma.challengeQuizQuestion.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError('CHALLENGE_QUIZ_NOT_FOUND', 'Question not found.', 404);
    }
    const row = await this.prisma.challengeQuizQuestion.update({
      where: { id },
      data: {
        question: dto.question.trim(),
        option0: dto.options[0].trim(),
        option1: dto.options[1].trim(),
        option2: dto.options[2].trim(),
        option3: dto.options[3].trim(),
        correctIndex: dto.correctIndex,
        enabled: dto.enabled,
      },
    });
    await auditChallenge(this.prisma, adminId, 'challenge.quiz.update', `quiz:${id}`, {
      id,
    });
    return mapQuizAdmin(row);
  }

  async deleteQuiz(adminId: string, rawId: string) {
    const id = sanitizeId(rawId, 'q');
    const deleted = await this.prisma.challengeQuizQuestion.deleteMany({
      where: { id },
    });
    if (deleted.count === 0) {
      throw new AppError('CHALLENGE_QUIZ_NOT_FOUND', 'Question not found.', 404);
    }
    await auditChallenge(this.prisma, adminId, 'challenge.quiz.delete', `quiz:${id}`, {
      id,
    });
    return { ok: true as const, id };
  }

  async createMilestone(adminId: string, dto: MilestoneDto) {
    assertMilestoneList([dto]);
    const id = sanitizeId(dto.id, `m${dto.days}`);
    try {
      const row = await this.prisma.challengeMilestone.create({
        data: {
          id,
          days: dto.days,
          title: dto.title.trim(),
          rewardLabel: dto.rewardLabel.trim(),
          coinReward: dto.coinReward,
          badge: dto.badge?.trim() ? dto.badge.trim().slice(0, 80) : null,
          enabled: dto.enabled,
        },
      });
      await auditChallenge(
        this.prisma,
        adminId,
        'challenge.milestone.create',
        `milestone:${id}`,
        { id, days: row.days },
      );
      return mapMilestone(row);
    } catch (e) {
      rethrowUnique(e, 'CHALLENGE_DUP_MS', 'Milestone id or day already exists.');
    }
  }

  async updateMilestone(adminId: string, rawId: string, dto: MilestoneDto) {
    assertMilestoneList([dto]);
    const id = sanitizeId(rawId, `m${dto.days}`);
    const existing = await this.prisma.challengeMilestone.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError('CHALLENGE_MS_NOT_FOUND', 'Milestone not found.', 404);
    }
    const clash = await this.prisma.challengeMilestone.findFirst({
      where: { days: dto.days, NOT: { id } },
      select: { id: true },
    });
    if (clash) {
      throw new AppError(
        'CHALLENGE_DUP_DAYS',
        `Duplicate milestone day: ${dto.days}`,
        400,
      );
    }
    try {
      const row = await this.prisma.challengeMilestone.update({
        where: { id },
        data: {
          days: dto.days,
          title: dto.title.trim(),
          rewardLabel: dto.rewardLabel.trim(),
          coinReward: dto.coinReward,
          badge: dto.badge?.trim() ? dto.badge.trim().slice(0, 80) : null,
          enabled: dto.enabled,
        },
      });
      await auditChallenge(
        this.prisma,
        adminId,
        'challenge.milestone.update',
        `milestone:${id}`,
        { id, days: row.days },
      );
      return mapMilestone(row);
    } catch (e) {
      rethrowUnique(e, 'CHALLENGE_DUP_DAYS', `Duplicate milestone day: ${dto.days}`);
    }
  }

  async deleteMilestone(adminId: string, rawId: string) {
    const id = sanitizeId(rawId, 'm');
    const deleted = await this.prisma.challengeMilestone.deleteMany({
      where: { id },
    });
    if (deleted.count === 0) {
      throw new AppError('CHALLENGE_MS_NOT_FOUND', 'Milestone not found.', 404);
    }
    await auditChallenge(
      this.prisma,
      adminId,
      'challenge.milestone.delete',
      `milestone:${id}`,
      { id },
    );
    return { ok: true as const, id };
  }
}
