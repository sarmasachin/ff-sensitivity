import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';

function cleanComment(raw: string, max: number) {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
}

@Injectable()
export class RedeemCommentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(redeemCodeId: string) {
    await this.requireCode(redeemCodeId);
    const rows = await this.prisma.redeemCodeComment.findMany({
      where: { redeemCodeId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        authorName: true,
        body: true,
        createdAt: true,
      },
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.authorName,
        text: row.body,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async add(userId: string, redeemCodeId: string, name: string, text: string) {
    await this.requireCode(redeemCodeId);
    const authorName = cleanComment(name, 24);
    const body = cleanComment(text, 280);
    if (!authorName || !body) {
      throw new AppError(
        'REDEEM_COMMENT_INVALID',
        'Name and comment are required.',
        400,
      );
    }
    const row = await this.prisma.redeemCodeComment.create({
      data: { userId, redeemCodeId, authorName, body },
      select: { id: true, authorName: true, body: true, createdAt: true },
    });
    return {
      id: row.id,
      name: row.authorName,
      text: row.body,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async requireCode(redeemCodeId: string) {
    const code = await this.prisma.redeemCode.findUnique({
      where: { id: redeemCodeId },
      select: { id: true },
    });
    if (!code) {
      throw new AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
    }
  }
}
