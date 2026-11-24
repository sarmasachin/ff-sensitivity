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
exports.SupportAdminInboxService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const support_shared_1 = require("./support-shared");
let SupportAdminInboxService = class SupportAdminInboxService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async adminList(q, status, subject, unread) {
        const where = {};
        const statusFilter = (0, support_shared_1.parseListStatus)(status);
        if (Array.isArray(statusFilter)) {
            where.status = { in: statusFilter };
        }
        else if (statusFilter) {
            where.status = statusFilter;
        }
        const subjectFilter = (0, support_shared_1.parseListSubject)(subject);
        if (subjectFilter)
            where.subject = subjectFilter;
        const unreadFilter = (0, support_shared_1.parseUnreadFlag)(unread);
        if (unreadFilter !== undefined)
            where.unread = unreadFilter;
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
            take: support_shared_1.LIST_LIMIT,
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        return { threads: rows.map((r) => (0, support_shared_1.toSupportThreadRow)(r)) };
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
        (0, support_shared_1.assertThreadId)(threadId);
        const message = (0, support_shared_1.sanitizeText)(dto.message, 2000);
        if (!message) {
            throw new app_error_1.AppError('SUPPORT_VALIDATION', 'Reply is required.', 400);
        }
        (0, support_shared_1.assertSafeMessage)(message);
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
        if (thread._count.messages >= support_shared_1.MAX_MESSAGES_PER_THREAD) {
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
        return (0, support_shared_1.toSupportThreadRow)(updated);
    }
    async adminClose(adminId, threadId) {
        (0, support_shared_1.assertThreadId)(threadId);
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
        return (0, support_shared_1.toSupportThreadRow)(updated);
    }
    async adminMarkRead(adminId, threadId) {
        (0, support_shared_1.assertThreadId)(threadId);
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
        return (0, support_shared_1.toSupportThreadRow)(updated);
    }
    async adminDeleteThread(adminId, threadId) {
        (0, support_shared_1.assertThreadId)(threadId);
        const thread = await this.prisma.supportThread.findUnique({
            where: { id: threadId.trim() },
            include: { _count: { select: { messages: true } } },
        });
        if (!thread) {
            throw new app_error_1.AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
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
                    },
                },
            });
        });
        return { ok: true, id: thread.id };
    }
    async adminDeleteUserMessage(adminId, threadId, messageId) {
        (0, support_shared_1.assertThreadId)(threadId);
        (0, support_shared_1.assertThreadId)(messageId, 'message');
        const message = await this.prisma.supportMessage.findUnique({
            where: { id: messageId.trim() },
        });
        if (!message || message.threadId !== threadId.trim()) {
            throw new app_error_1.AppError('SUPPORT_NOT_FOUND', 'Message not found.', 404);
        }
        if (message.sender !== client_1.SupportSender.USER) {
            throw new app_error_1.AppError('SUPPORT_DELETE_FORBIDDEN', 'Only user messages can be deleted from the inbox.', 403);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.supportMessage.delete({ where: { id: message.id } });
            const row = await tx.supportThread.findUnique({
                where: { id: threadId.trim() },
                include: { messages: { orderBy: { createdAt: 'asc' } } },
            });
            if (!row) {
                throw new app_error_1.AppError('SUPPORT_NOT_FOUND', 'Thread not found.', 404);
            }
            await tx.auditLog.create({
                data: {
                    actorAdminId: adminId,
                    action: 'support.delete_user_message',
                    entity: `support_thread:${row.id}`,
                    afterJson: {
                        messageId: message.id,
                        textLen: message.text.length,
                    },
                },
            });
            return row;
        });
        return (0, support_shared_1.toSupportThreadRow)(updated);
    }
};
exports.SupportAdminInboxService = SupportAdminInboxService;
exports.SupportAdminInboxService = SupportAdminInboxService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupportAdminInboxService);
//# sourceMappingURL=support-admin-inbox.service.js.map