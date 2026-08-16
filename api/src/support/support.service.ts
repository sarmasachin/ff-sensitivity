import { Injectable } from '@nestjs/common';
import { SupportSender, SupportStatus, SupportSubject } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { StartSupportThreadDto, SupportMessageDto } from './dto/support.dto';
import {
  MAX_MESSAGES_PER_THREAD,
  MAX_OPEN_THREADS,
  SUPPORT_ACKNOWLEDGEMENT,
  assertSafeMessage,
  assertThreadId,
  sanitizeText,
  toSupportThreadRow,
} from './support-shared';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async userGetMine(userId: string) {
    const thread = await this.prisma.supportThread.findFirst({
      where: {
        userId,
        status: { not: SupportStatus.CLOSED },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    return { thread: thread ? toSupportThreadRow(thread) : null };
  }

  async userStart(userId: string, dto: StartSupportThreadDto) {
    const account = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!account || !account.isActive) {
      throw new AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
    }

    const name = sanitizeText(account.displayName || dto.name, 40);
    const email = sanitizeText(account.email, 80).toLowerCase();
    const message = sanitizeText(dto.message, 1000);
    const appVersion = sanitizeText(dto.appVersion, 40) || '—';
    const deviceLabel = sanitizeText(dto.deviceLabel, 120) || 'Unknown device';
    if (!name || !email || !message) {
      throw new AppError(
        'SUPPORT_VALIDATION',
        'Name, email, and message are required.',
        400,
      );
    }
    assertSafeMessage(message);

    const openCount = await this.prisma.supportThread.count({
      where: { userId, status: { not: SupportStatus.CLOSED } },
    });
    if (openCount >= MAX_OPEN_THREADS) {
      throw new AppError(
        'SUPPORT_OPEN_LIMIT',
        'You already have an open support thread. Reply there instead.',
        409,
      );
    }

    const receivedAt = new Date();
    const created = await this.prisma.supportThread.create({
      data: {
        userId,
        name,
        email,
        subject: dto.subject as SupportSubject,
        status: SupportStatus.OPEN,
        appVersion,
        deviceLabel,
        unread: true,
        messages: {
          create: [
            {
              sender: SupportSender.USER,
              text: message,
              createdAt: receivedAt,
            },
            {
              sender: SupportSender.ADMIN,
              text: SUPPORT_ACKNOWLEDGEMENT,
              createdAt: new Date(receivedAt.getTime() + 1),
            },
          ],
        },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return toSupportThreadRow(created);
  }

  async userReply(userId: string, threadId: string, dto: SupportMessageDto) {
    assertThreadId(threadId);
    const message = sanitizeText(dto.message, 1000);
    if (!message) {
      throw new AppError('SUPPORT_VALIDATION', 'Message is required.', 400);
    }
    assertSafeMessage(message);

    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId.trim() },
      include: { _count: { select: { messages: true } } },
    });
    if (!thread || thread.userId !== userId) {
      throw new AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
    }
    if (thread.status === SupportStatus.CLOSED) {
      throw new AppError(
        'SUPPORT_CLOSED',
        'This thread is closed. Start a new conversation.',
        409,
      );
    }
    if (thread._count.messages >= MAX_MESSAGES_PER_THREAD) {
      throw new AppError(
        'SUPPORT_MSG_LIMIT',
        'Message limit reached for this thread.',
        429,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          threadId: thread.id,
          sender: SupportSender.USER,
          text: message,
        },
      });
      return tx.supportThread.update({
        where: { id: thread.id },
        data: {
          status: SupportStatus.PENDING_REPLY,
          unread: true,
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    });

    return toSupportThreadRow(updated);
  }
}
