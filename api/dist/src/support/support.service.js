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
const support_shared_1 = require("./support-shared");
let SupportService = class SupportService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
        return { thread: thread ? (0, support_shared_1.toSupportThreadRow)(thread) : null };
    }
    async userStart(userId, dto) {
        const account = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!account || !account.isActive) {
            throw new app_error_1.AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
        }
        const name = (0, support_shared_1.sanitizeText)(account.displayName || dto.name, 40);
        const email = (0, support_shared_1.sanitizeText)(account.email, 80).toLowerCase();
        const message = (0, support_shared_1.sanitizeText)(dto.message, 1000);
        const appVersion = (0, support_shared_1.sanitizeText)(dto.appVersion, 40) || '—';
        const deviceLabel = (0, support_shared_1.sanitizeText)(dto.deviceLabel, 120) || 'Unknown device';
        if (!name || !email || !message) {
            throw new app_error_1.AppError('SUPPORT_VALIDATION', 'Name, email, and message are required.', 400);
        }
        (0, support_shared_1.assertSafeMessage)(message);
        const openCount = await this.prisma.supportThread.count({
            where: { userId, status: { not: client_1.SupportStatus.CLOSED } },
        });
        if (openCount >= support_shared_1.MAX_OPEN_THREADS) {
            throw new app_error_1.AppError('SUPPORT_OPEN_LIMIT', 'You already have an open support thread. Reply there instead.', 409);
        }
        const receivedAt = new Date();
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
                    create: [
                        {
                            sender: client_1.SupportSender.USER,
                            text: message,
                            createdAt: receivedAt,
                        },
                        {
                            sender: client_1.SupportSender.ADMIN,
                            text: support_shared_1.SUPPORT_ACKNOWLEDGEMENT,
                            createdAt: new Date(receivedAt.getTime() + 1),
                        },
                    ],
                },
            },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        return (0, support_shared_1.toSupportThreadRow)(created);
    }
    async userReply(userId, threadId, dto) {
        (0, support_shared_1.assertThreadId)(threadId);
        const message = (0, support_shared_1.sanitizeText)(dto.message, 1000);
        if (!message) {
            throw new app_error_1.AppError('SUPPORT_VALIDATION', 'Message is required.', 400);
        }
        (0, support_shared_1.assertSafeMessage)(message);
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
        if (thread._count.messages >= support_shared_1.MAX_MESSAGES_PER_THREAD) {
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
        return (0, support_shared_1.toSupportThreadRow)(updated);
    }
};
exports.SupportService = SupportService;
exports.SupportService = SupportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupportService);
//# sourceMappingURL=support.service.js.map