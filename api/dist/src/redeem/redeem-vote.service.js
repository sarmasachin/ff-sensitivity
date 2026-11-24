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
exports.RedeemVoteService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
let RedeemVoteService = class RedeemVoteService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async cast(userId, redeemCodeId, worked) {
        const code = await this.prisma.redeemCode.findUnique({
            where: { id: redeemCodeId },
            select: { id: true },
        });
        if (!code) {
            throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
        }
        const existing = await this.prisma.redeemCodeVote.findUnique({
            where: { userId_redeemCodeId: { userId, redeemCodeId } },
            select: { id: true },
        });
        if (!existing) {
            try {
                await this.prisma.redeemCodeVote.create({
                    data: { userId, redeemCodeId, worked },
                });
            }
            catch (err) {
                if (!(err instanceof client_1.Prisma.PrismaClientKnownRequestError) ||
                    err.code !== 'P2002') {
                    throw err;
                }
            }
        }
        const tally = await this.tally(userId, [redeemCodeId]);
        const slot = tally.get(redeemCodeId) ?? {
            yesCount: 0,
            noCount: 0,
            myVote: worked,
        };
        return {
            worked: slot.myVote === true,
            yesCount: slot.yesCount,
            noCount: slot.noCount,
        };
    }
    async tally(userId, codeIds) {
        const out = new Map();
        for (const id of codeIds) {
            out.set(id, { yesCount: 0, noCount: 0, myVote: null });
        }
        if (codeIds.length === 0)
            return out;
        const [grouped, mine] = await Promise.all([
            this.prisma.redeemCodeVote.groupBy({
                by: ['redeemCodeId', 'worked'],
                where: { redeemCodeId: { in: codeIds } },
                _count: { _all: true },
            }),
            this.prisma.redeemCodeVote.findMany({
                where: { userId, redeemCodeId: { in: codeIds } },
                select: { redeemCodeId: true, worked: true },
            }),
        ]);
        for (const row of grouped) {
            const slot = out.get(row.redeemCodeId);
            if (!slot)
                continue;
            if (row.worked)
                slot.yesCount = row._count._all;
            else
                slot.noCount = row._count._all;
        }
        for (const row of mine) {
            const slot = out.get(row.redeemCodeId);
            if (slot)
                slot.myVote = row.worked;
        }
        return out;
    }
};
exports.RedeemVoteService = RedeemVoteService;
exports.RedeemVoteService = RedeemVoteService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RedeemVoteService);
//# sourceMappingURL=redeem-vote.service.js.map