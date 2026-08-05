import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SupportSender,
  SupportStatus,
  SupportSubject,
} from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AdminSupportReplyDto,
  StartSupportThreadDto,
  SupportMessageDto,
} from './dto/support.dto';

// --- Start: Support live wire (Sachin) ---
const MAX_MESSAGES_PER_THREAD = 40;
const MAX_OPEN_THREADS = 1;
const LIST_LIMIT = 100;

function stamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sanitizeText(raw: string, max: number): string {
  return [...raw]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code === 0x0a || code === 0x0d) return true;
      if (code < 0x20 || code === 0x7f) return false;
      if (code >= 0x200b && code <= 0x200f) return false;
      if (code === 0xfeff) return false;
      return true;
    })
    .join('')
    .trim()
    .slice(0, max);
}

function assertSafeMessage(text: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'SUPPORT_UNSAFE_TEXT',
      'Message contains disallowed content.',
      400,
    );
  }
}

function assertThreadId(id: string) {
  if (!id?.trim() || id.includes('/') || id.length > 64) {
    throw new AppError('SUPPORT_BAD_ID', 'Invalid thread id.', 400);
  }
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private toMessage(m: {
    id: string;
    sender: SupportSender;
    text: string;
    createdAt: Date;
  }) {
    return {
      id: m.id,
      sender: m.sender,
      text: m.text,
      createdAt: stamp(m.createdAt),
      createdAtMs: m.createdAt.getTime(),
    };
  }

  private toThreadRow(
    t: {
      id: string;
      name: string;
      email: string;
      subject: SupportSubject;
      status: SupportStatus;
      appVersion: string;
      deviceLabel: string;
      unread: boolean;
      createdAt: Date;
      updatedAt: Date;
      messages: {
        id: string;
        sender: SupportSender;
        text: string;
        createdAt: Date;
      }[];
    },
  ) {
    return {
      id: t.id,
      name: t.name,
      email: t.email,
      subject: t.subject,
      status: t.status,
      appVersion: t.appVersion,
      deviceLabel: t.deviceLabel,
      unread: t.unread,
      createdAt: stamp(t.createdAt),
      updatedAt: stamp(t.updatedAt),
      createdAtMs: t.createdAt.getTime(),
      updatedAtMs: t.updatedAt.getTime(),
      messages: t.messages.map((m) => this.toMessage(m)),
    };
  }

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
    return { thread: thread ? this.toThreadRow(thread) : null };
  }

  async userStart(userId: string, dto: StartSupportThreadDto) {
    const account = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!account || !account.isActive) {
      throw new AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
    }

    // Bind identity to the signed-in account — ignore spoofed name/email from client.
    const name = sanitizeText(account.displayName || dto.name, 40);
    const email = sanitizeText(account.email, 80).toLowerCase();
    const message = sanitizeText(dto.message, 1000);
    const appVersion = sanitizeText(dto.appVersion, 40) || '—';
    const deviceLabel = sanitizeText(dto.deviceLabel, 120) || 'Unknown device';
    if (!name || !email || !message) {
      throw new AppError('SUPPORT_VALIDATION', 'Name, email, and message are required.', 400);
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
          create: {
            sender: SupportSender.USER,
            text: message,
          },
        },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return this.toThreadRow(created);
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

    return this.toThreadRow(updated);
  }

  async adminList(q?: string, status?: string) {
    const where: Prisma.SupportThreadWhereInput = {};
    if (
      status &&
      ['OPEN', 'PENDING_REPLY', 'REPLIED', 'CLOSED'].includes(status)
    ) {
      where.status = status as SupportStatus;
    }
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
    return { threads: rows.map((r) => this.toThreadRow(r)) };
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

    return this.toThreadRow(updated);
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
    return this.toThreadRow(updated);
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
    return this.toThreadRow(updated);
  }
}
// --- End: Support live wire (Sachin) ---
