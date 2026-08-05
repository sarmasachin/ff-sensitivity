"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_MESSAGES_PER_THREAD = 40;
const MAX_OPEN_THREADS = 1;
const LIST_LIMIT = 100;
function stamp(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function sanitizeText(raw, max) {
    return [...raw]
        .filter((ch) => {
        const code = ch.codePointAt(0) ?? 0;
        if (code === 0x0a || code === 0x0d)
            return true;
        if (code < 0x20 || code === 0x7f)
            return false;
        if (code >= 0x200b && code <= 0x200f)
            return false;
        if (code === 0xfeff)
            return false;
        return true;
    })
        .join('')
        .trim()
        .slice(0, max);
}
function assertSafeMessage(text) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('SUPPORT_UNSAFE_TEXT', 'Message contains disallowed content.', 400);
    }
}
function assertThreadId(id) {
    if (!id?.trim() || id.includes('/') || id.length > 64) {
        throw new app_error_1.AppError('SUPPORT_BAD_ID', 'Invalid thread id.', 400);
    }
}
let SupportService = class SupportService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    toMessage(m) {
        return {
            id: m.id,
            sender: m.sender,
            text: m.text,
            createdAt: stamp(m.createdAt),
            createdAtMs: m.createdAt.getTime(),
        };
    }
    toThreadRow(t) {
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
    async userGetMine(userId) {
        const thread = await this.prisma.supportThread.findFirst({
            where: {
                userId,
                status: { not: client_1.SupportStatus.CLOSED },
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
            },
        });
        return { thread: thread ? this.toThreadRow(thread) : null };
    }
    async userStart(userId, dto) {
        const account = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!account || !account.isActive) {
            throw new app_error_1.AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
        }
        const name = sanitizeText(account.displayName || dto.name, 40);
        const email = sanitizeText(account.email, 80).toLowerCase();
        const message = sanitizeText(dto.message, 1000);
        const appVersion = sanitizeText(dto.appVersion, 40) || '—';
        const deviceLabel = sanitizeText(dto.deviceLabel, 120) || 'Unknown device';
        if (!name || !email || !message) {
            throw new app_error_1.AppError('SUPPORT_VALIDATION', 'Name, email, and message are required.', 400);
        }
        assertSafeMessage(message);
        const openCount = await this.prisma.supportThread.count({
            where: { userId, status: { not: client_1.SupportStatus.CLOSED } },
        });
        if (openCount >= MAX_OPEN_THREADS) {
            throw new app_error_1.AppError('SUPPORT_OPEN_LIMIT', 'You already have an open support thread. Reply there instead.', 409);
        }
        const created = await this.prisma.supportThread.create({
            data: {
                userId,
                name,
                email,
                subject: dto.subject,
                status: client_1.SupportStatus.OPEN,
                appVersion,
                deviceLabel,
                unread: true,
                messages: {
                    create: {
                        sender: client_1.SupportSender.USER,
                        text: message,
                    },
                },
            },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        return this.toThreadRow(created);
    }
    async userReply(userId, threadId, dto) {
        assertThreadId(threadId);
        const message = sanitizeText(dto.message, 1000);
        if (!message) {
            throw new app_error_1.AppError('SUPPORT_VALIDATION', 'Message is required.', 400);
        }
        assertSafeMessage(message);
        const thread = await this.prisma.supportThread.findUnique({
            where: { id: threadId.trim() },
            include: { _count: { select: { messages: true } } },
        });
        if (!thread || thread.userId !== userId) {
            throw new app_error_1.AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
        }
        if (thread.status === client_1.SupportStatus.CLOSED) {
            throw new app_error_1.AppError('SUPPORT_CLOSED', 'This thread is closed. Start a new conversation.', 409);
        }
        if (thread._count.messages >= MAX_MESSAGES_PER_THREAD) {
            throw new app_error_1.AppError('SUPPORT_MSG_LIMIT', 'Message limit reached for this thread.', 429);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.supportMessage.create({
                data: {
                    threadId: thread.id,
                    sender: client_1.SupportSender.USER,
                    text: message,
                },
            });
            return tx.supportThread.update({
                where: { id: thread.id },
                data: {
                    status: client_1.SupportStatus.PENDING_REPLY,
                    unread: true,
                },
                include: { messages: { orderBy: { createdAt: 'asc' } } },
            });
        });
        return this.toThreadRow(updated);
    }
    async adminList(q, status) {
        const where = {};
        if (status &&
            ['OPEN', 'PENDING_REPLY', 'REPLIED', 'CLOSED'].includes(status)) {
            where.status = status;
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
            this.prisma.supportThread.count({ where: { status: client_1.SupportStatus.OPEN } }),
            this.prisma.supportThread.count({
                where: { status: client_1.SupportStatus.PENDING_REPLY },
            }),
            this.prisma.supportThread.count({
                where: { status: client_1.SupportStatus.REPLIED },
            }),
            this.prisma.supportThread.count({
                where: { status: client_1.SupportStatus.CLOSED },
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
    async adminReply(adminId, threadId, dto) {
        assertThreadId(threadId);
        const message = sanitizeText(dto.message, 2000);
        if (!message) {
            throw new app_error_1.AppError('SUPPORT_VALIDATION', 'Reply is required.', 400);
        }
        assertSafeMessage(message);
        const thread = await this.prisma.supportThread.findUnique({
            where: { id: threadId.trim() },
            include: { _count: { select: { messages: true } } },
        });
        if (!thread) {
            throw new app_error_1.AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
        }
        if (thread.status === client_1.SupportStatus.CLOSED) {
            throw new app_error_1.AppError('SUPPORT_CLOSED', 'Thread is closed.', 409);
        }
        if (thread._count.messages >= MAX_MESSAGES_PER_THREAD) {
            throw new app_error_1.AppError('SUPPORT_MSG_LIMIT', 'Message limit reached for this thread.', 429);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.supportMessage.create({
                data: {
                    threadId: thread.id,
                    sender: client_1.SupportSender.ADMIN,
                    text: message,
                },
            });
            const row = await tx.supportThread.update({
                where: { id: thread.id },
                data: {
                    status: client_1.SupportStatus.REPLIED,
                    unread: false,
                },
                include: { messages: { orderBy: { createdAt: 'asc' } } },
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId: adminId,
                    action: 'support.reply',
                    entity: `support_thread:${thread.id}`,
                    afterJson: { messageLen: message.length },
                },
            });
            return row;
        });
        return this.toThreadRow(updated);
    }
    async adminClose(adminId, threadId) {
        assertThreadId(threadId);
        const thread = await this.prisma.supportThread.findUnique({
            where: { id: threadId.trim() },
        });
        if (!thread) {
            throw new app_error_1.AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const row = await tx.supportThread.update({
                where: { id: thread.id },
                data: { status: client_1.SupportStatus.CLOSED, unread: false },
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
    async adminMarkRead(adminId, threadId) {
        assertThreadId(threadId);
        const thread = await this.prisma.supportThread.findUnique({
            where: { id: threadId.trim() },
        });
        if (!thread) {
            throw new app_error_1.AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
        }
        const updated = await this.prisma.supportThread.update({
            where: { id: thread.id },
            data: { unread: false },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        void adminId;
        return this.toThreadRow(updated);
    }
};
exports.SupportService = SupportService;
exports.SupportService = SupportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupportService);
//# sourceMappingURL=support.service.js.map