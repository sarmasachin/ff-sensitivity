import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SupportSender,
  SupportStatus,
} from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminSupportReplyDto } from './dto/support.dto';
import {
  LIST_LIMIT,
  MAX_MESSAGES_PER_THREAD,
  assertSafeMessage,
  assertThreadId,
  parseListStatus,
  parseListSubject,
  parseUnreadFlag,
  sanitizeText,
  toSupportThreadRow,
} from './support-shared';

@Injectable()
export class SupportAdminInboxService {
  constructor(private readonly prisma: PrismaService) {}

  async adminList(
    q?: string,
    status?: string,
    subject?: string,
    unread?: string,
  ) {
    const where: Prisma.SupportThreadWhereInput = {};
    const statusFilter = parseListStatus(status);
    if (Array.isArray(statusFilter)) {
      where.status = { in: statusFilter };
    } else if (statusFilter) {
      where.status = statusFilter;
    }
    const subjectFilter = parseListSubject(subject);
    if (subjectFilter) where.subject = subjectFilter;
    const unreadFilter = parseUnreadFlag(unread);
    if (unreadFilter !== undefined) where.unread = unreadFilter;

    const query = (q ?? '').trim().slice(0, 80);
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { deviceLabel: { contains: query, mode: 'insensitive' } },
        { appVersion: { contains: query, mode: 'insensitive' } },
        { messages: { some: { text: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    const rows = await this.prisma.supportThread.findMany({
      where,
      orderBy: [{ unread: 'desc' }, { updatedAt: 'desc' }],
      take: LIST_LIMIT,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return { threads: rows.map((r) => toSupportThreadRow(r)) };
  }

  async adminStats() {
    const [total, open, pending, replied, closed, unread] = await Promise.all([
      this.prisma.supportThread.count(),
      this.prisma.supportThread.count({ where: { status: SupportStatus.OPEN } }),
      this.prisma.supportThread.count({
        where: { status: SupportStatus.PENDING_REPLY },
      }),
      this.prisma.supportThread.count({
        where: { status: SupportStatus.REPLIED },
      }),
      this.prisma.supportThread.count({
        where: { status: SupportStatus.CLOSED },
      }),
      this.prisma.supportThread.count({ where: { unread: true } }),
    ]);
    return {
      total,
      open: open + pending,
      unread,
      replied,
      closed,
    };
  }

  async adminReply(adminId: string, threadId: string, dto: AdminSupportReplyDto) {
    assertThreadId(threadId);
    const message = sanitizeText(dto.message, 2000);
    if (!message) {
      throw new AppError('SUPPORT_VALIDATION', 'Reply is required.', 400);
    }
    assertSafeMessage(message);

    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId.trim() },
      include: { _count: { select: { messages: true } } },
    });
    if (!thread) {
      throw new AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
    }
    if (thread.status === SupportStatus.CLOSED) {
      throw new AppError('SUPPORT_CLOSED', 'Thread is closed.', 409);
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
          sender: SupportSender.ADMIN,
          text: message,
        },
      });
      const row = await tx.supportThread.update({
        where: { id: thread.id },
        data: {
          status: SupportStatus.REPLIED,
          unread: false,
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: 'support.reply',
          entity: `support_thread:${thread.id}`,
          afterJson: { messageLen: message.length } as Prisma.InputJsonValue,
        },
      });
      return row;
    });

    return toSupportThreadRow(updated);
  }

  async adminClose(adminId: string, threadId: string) {
    assertThreadId(threadId);
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId.trim() },
    });
    if (!thread) {
      throw new AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.supportThread.update({
        where: { id: thread.id },
        data: { status: SupportStatus.CLOSED, unread: false },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: 'support.close',
          entity: `support_thread:${thread.id}`,
        },
      });
      return row;
    });
    return toSupportThreadRow(updated);
  }

  async adminMarkRead(adminId: string, threadId: string) {
    assertThreadId(threadId);
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId.trim() },
    });
    if (!thread) {
      throw new AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
    }
    const updated = await this.prisma.supportThread.update({
      where: { id: thread.id },
      data: { unread: false },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    void adminId;
    return toSupportThreadRow(updated);
  }

  async adminDeleteThread(adminId: string, threadId: string) {
    assertThreadId(threadId);
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: threadId.trim() },
      include: { _count: { select: { messages: true } } },
    });
    if (!thread) {
      throw new AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.supportThread.delete({ where: { id: thread.id } });
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: 'support.delete_thread',
          entity: `support_thread:${thread.id}`,
          afterJson: {
            email: thread.email,
            messageCount: thread._count.messages,
          } as Prisma.InputJsonValue,
        },
      });
    });

    return { ok: true as const, id: thread.id };
  }

  async adminDeleteUserMessage(
    adminId: string,
    threadId: string,
    messageId: string,
  ) {
    assertThreadId(threadId);
    assertThreadId(messageId, 'message');

    const message = await this.prisma.supportMessage.findUnique({
      where: { id: messageId.trim() },
    });
    if (!message || message.threadId !== threadId.trim()) {
      throw new AppError('SUPPORT_NOT_FOUND', 'Message not found.', 404);
    }
    if (message.sender !== SupportSender.USER) {
      throw new AppError(
        'SUPPORT_DELETE_FORBIDDEN',
        'Only user messages can be deleted from the inbox.',
        403,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.supportMessage.delete({ where: { id: message.id } });
      const row = await tx.supportThread.findUnique({
        where: { id: threadId.trim() },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!row) {
        throw new AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
      }
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: 'support.delete_user_message',
          entity: `support_thread:${row.id}`,
          afterJson: {
            messageId: message.id,
            textLen: message.text.length,
          } as Prisma.InputJsonValue,
        },
      });
      return row;
    });

    return toSupportThreadRow(updated);
  }
}
