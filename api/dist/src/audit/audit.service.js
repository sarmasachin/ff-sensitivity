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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_security_1 = require("./audit-security");
let AuditService = class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    toRow(row, now = new Date()) {
        const h = (0, audit_security_1.hoursAgo)(row.createdAt, now);
        const actorEmail = row.actor?.email ?? 'system@ffops';
        const actorName = row.actor?.displayName?.trim() ||
            (row.actor ? actorEmail.split('@')[0] : 'system');
        return {
            id: row.id,
            atLabel: (0, audit_security_1.formatWhen)(h),
            hoursAgo: Math.round(h * 10) / 10,
            actorName,
            actorEmail: row.actor ? (0, audit_security_1.maskEmail)(actorEmail) : actorEmail,
            category: (0, audit_security_1.mapCategory)(row.action),
            action: (0, audit_security_1.humanAction)(row.action),
            target: row.entity || '—',
            result: (0, audit_security_1.mapResult)(row.action, row.afterJson),
            ipLabel: (0, audit_security_1.extractIp)(row.afterJson),
            detail: (0, audit_security_1.summarizeDetail)(row.beforeJson, row.afterJson),
        };
    }
    async adminList(limit = 200) {
        const take = Math.min(500, Math.max(1, limit));
        const rows = await this.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take,
            include: {
                actor: { select: { email: true, displayName: true } },
            },
        });
        const now = new Date();
        return { events: rows.map((r) => this.toRow(r, now)) };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map