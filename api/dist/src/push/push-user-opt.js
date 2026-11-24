"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAllowsPush = userAllowsPush;
async function userAllowsPush(prisma, userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { notifyPush: true },
    });
    return user?.notifyPush !== false;
}
//# sourceMappingURL=push-user-opt.js.map