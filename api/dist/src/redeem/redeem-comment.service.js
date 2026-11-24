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
exports.RedeemCommentService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
function cleanComment(raw, max) {
    return raw
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .trim()
        .slice(0, max);
}
let RedeemCommentService = class RedeemCommentService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(redeemCodeId) {
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
    async add(userId, redeemCodeId, name, text) {
        await this.requireCode(redeemCodeId);
        const authorName = cleanComment(name, 24);
        const body = cleanComment(text, 280);
        if (!authorName || !body) {
            throw new app_error_1.AppError('REDEEM_COMMENT_INVALID', 'Name and comment are required.', 400);
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
    async requireCode(redeemCodeId) {
        const code = await this.prisma.redeemCode.findUnique({
            where: { id: redeemCodeId },
            select: { id: true },
        });
        if (!code) {
            throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
        }
    }
};
exports.RedeemCommentService = RedeemCommentService;
exports.RedeemCommentService = RedeemCommentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RedeemCommentService);
//# sourceMappingURL=redeem-comment.service.js.map