import { Injectable } from '@nestjs/common';
import {
  CommunityPost,
  CommunityPostStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { SubmitCommunityPostDto } from './dto/community.dto';

// --- Start: Community live wire (Sachin) ---
const URLISH = /https?:\/\/|www\.|\.(com|net|org|in)\b/i;
const MAX_PENDING_PER_USER = 3;
const FEED_LIMIT = 50;

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async feed() {
    const rows = await this.prisma.communityPost.findMany({
      where: {
        status: {
          in: [CommunityPostStatus.APPROVED, CommunityPostStatus.FEATURED],
        },
      },
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
      take: FEED_LIMIT,
    });
    // FEATURED sorts after APPROVED alphabetically — pin featured manually.
    const featured = rows.filter((r) => r.status === CommunityPostStatus.FEATURED);
    const approved = rows.filter((r) => r.status === CommunityPostStatus.APPROVED);
    return [...featured, ...approved].map((r) => this.toPublicCard(r));
  }

  async submit(userId: string, dto: SubmitCommunityPostDto) {
    this.assertCleanText(dto.name, 'name');
    this.assertCleanText(dto.deviceLabel, 'deviceLabel');
    if (dto.deviceMeta) this.assertCleanText(dto.deviceMeta, 'deviceMeta');

    const pendingCount = await this.prisma.communityPost.count({
      where: { userId, status: CommunityPostStatus.PENDING },
    });
    if (pendingCount >= MAX_PENDING_PER_USER) {
      throw new AppError(
        'COMMUNITY_PENDING_LIMIT',
        `You already have ${MAX_PENDING_PER_USER} posts waiting for review.`,
        429,
      );
    }

    const post = await this.prisma.communityPost.create({
      data: {
        userId,
        name: dto.name.trim(),
        freeFireId: dto.freeFireId.trim(),
        rank: dto.rank,
        role: dto.role,
        deviceLabel: dto.deviceLabel.trim(),
        deviceMeta: (dto.deviceMeta ?? '').trim(),
        matches: dto.matches,
        kills: dto.kills,
        headshots: dto.headshots,
        general: dto.general,
        redDot: dto.redDot,
        scope2x: dto.scope2x,
        scope4x: dto.scope4x,
        awm: dto.awm,
        freeLook: dto.freeLook,
        status: CommunityPostStatus.PENDING,
      },
    });

    return {
      id: post.id,
      status: post.status,
      message: 'Submitted for review. It will appear in Community after approval.',
    };
  }

  async report(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new AppError('COMMUNITY_NOT_FOUND', 'Post not found.', 404);
    }
    if (post.userId === userId) {
      throw new AppError(
        'COMMUNITY_REPORT_OWN',
        'You cannot report your own post.',
        400,
      );
    }
    if (
      post.status !== CommunityPostStatus.APPROVED &&
      post.status !== CommunityPostStatus.FEATURED
    ) {
      throw new AppError(
        'COMMUNITY_REPORT_STATUS',
        'Only live posts can be reported.',
        400,
      );
    }

    try {
      await this.prisma.$transaction([
        this.prisma.communityPostReport.create({
          data: { postId, userId },
        }),
        this.prisma.communityPost.update({
          where: { id: postId },
          data: { reports: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppError(
          'COMMUNITY_ALREADY_REPORTED',
          'You already reported this post.',
          409,
        );
      }
      throw err;
    }

    return { ok: true };
  }

  async adminList(query?: string, status?: string) {
    const where: Prisma.CommunityPostWhereInput = {};
    if (
      status &&
      Object.values(CommunityPostStatus).includes(status as CommunityPostStatus)
    ) {
      where.status = status as CommunityPostStatus;
    }
    const q = query?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { freeFireId: { contains: q } },
        { deviceLabel: { contains: q, mode: 'insensitive' } },
        { rank: { contains: q, mode: 'insensitive' } },
        { role: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.communityPost.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return rows.map((r) => this.toAdminRow(r));
  }

  async adminStats() {
    const [pending, approved, featured, hidden, flagged] = await Promise.all([
      this.prisma.communityPost.count({
        where: { status: CommunityPostStatus.PENDING },
      }),
      this.prisma.communityPost.count({
        where: { status: CommunityPostStatus.APPROVED },
      }),
      this.prisma.communityPost.count({
        where: { status: CommunityPostStatus.FEATURED },
      }),
      this.prisma.communityPost.count({
        where: { status: CommunityPostStatus.HIDDEN },
      }),
      this.prisma.communityPost.count({
        where: {
          OR: [
            { reports: { gt: 0 } },
            { status: CommunityPostStatus.HIDDEN },
          ],
        },
      }),
    ]);
    return {
      pending,
      live: approved + featured,
      featured,
      flagged,
      hidden,
    };
  }

  async adminSetStatus(
    adminId: string,
    postId: string,
    status: CommunityPostStatus,
  ) {
    const before = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });
    if (!before) {
      throw new AppError('COMMUNITY_NOT_FOUND', 'Post not found.', 404);
    }

    const after = await this.prisma.communityPost.update({
      where: { id: postId },
      data: { status },
    });

    await this.prisma.auditLog.create({
      data: {
        actorAdminId: adminId,
        action: `community.status.${status.toLowerCase()}`,
        entity: `community_post:${postId}`,
        beforeJson: { status: before.status },
        afterJson: { status: after.status },
      },
    });

    return this.toAdminRow(after);
  }

  private assertCleanText(value: string, field: string) {
    if (URLISH.test(value)) {
      throw new AppError(
        'COMMUNITY_INVALID_TEXT',
        `${field} cannot contain links.`,
        400,
      );
    }
  }

  private toPublicCard(row: CommunityPost) {
    return {
      id: row.id,
      name: row.name,
      freeFireId: row.freeFireId,
      rank: row.rank,
      role: row.role,
      deviceLabel: row.deviceLabel,
      deviceMeta: row.deviceMeta,
      matches: row.matches,
      kills: row.kills,
      headshots: row.headshots,
      general: row.general,
      redDot: row.redDot,
      scope2x: row.scope2x,
      scope4x: row.scope4x,
      awm: row.awm,
      freeLook: row.freeLook,
      featured: row.status === CommunityPostStatus.FEATURED,
    };
  }

  private toAdminRow(row: CommunityPost) {
    return {
      id: row.id,
      name: row.name,
      freeFireId: row.freeFireId,
      rank: row.rank,
      role: row.role,
      deviceLabel: row.deviceLabel,
      deviceMeta: row.deviceMeta,
      matches: row.matches,
      kills: row.kills,
      headshots: row.headshots,
      general: row.general,
      redDot: row.redDot,
      scope2x: row.scope2x,
      scope4x: row.scope4x,
      awm: row.awm,
      freeLook: row.freeLook,
      status: row.status,
      reports: row.reports,
      createdAt: row.createdAt.toISOString(),
      submittedLabel: relativeLabel(row.createdAt),
    };
  }
}

function relativeLabel(date: Date): string {
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}
// --- End: Community live wire (Sachin) ---
