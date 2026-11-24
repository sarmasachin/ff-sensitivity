"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userListSelect = exports.installSelect = void 0;
exports.toUserRow = toUserRow;
const users_security_1 = require("./users-security");
exports.installSelect = {
    installId: true,
    userId: true,
    brand: true,
    model: true,
    androidVersion: true,
    appVersion: true,
    lastSeenAt: true,
};
exports.userListSelect = {
    id: true,
    email: true,
    displayName: true,
    googleName: true,
    photoUrl: true,
    ffUid: true,
    playRole: true,
    region: true,
    notifyPush: true,
    streakDays: true,
    googleSub: true,
    coins: true,
    isActive: true,
    isRestricted: true,
    dataDeletedAt: true,
    accountNote: true,
    createdAt: true,
    lastLoginAt: true,
    _count: { select: { claims: true } },
    deviceInstalls: {
        orderBy: { lastSeenAt: 'desc' },
        take: 1,
        select: exports.installSelect,
    },
};
function shown(value) {
    const text = value.trim();
    return text || '—';
}
function toUserRow(user, now = new Date()) {
    const install = user.deviceInstalls[0];
    const ownsInstall = Boolean(install?.userId && install.userId === user.id);
    const activityAt = ownsInstall &&
        install.lastSeenAt &&
        (!user.lastLoginAt || install.lastSeenAt > user.lastLoginAt)
        ? install.lastSeenAt
        : (user.lastLoginAt ?? user.createdAt);
    const h = (0, users_security_1.hoursAgo)(activityAt, now);
    const deviceLabel = install
        ? [install.model || install.brand || 'Device', install.androidVersion]
            .filter(Boolean)
            .join(' · ')
        : '—';
    return {
        id: user.id,
        displayName: user.displayName || 'Player',
        googleName: user.googleName.trim() || user.displayName || 'Player',
        photoUrl: user.photoUrl,
        email: (0, users_security_1.maskEmail)(user.email),
        googleSubMasked: (0, users_security_1.maskGoogleSub)(user.googleSub),
        status: (0, users_security_1.mapAccountStatus)(user.isActive, user.isRestricted, user.dataDeletedAt),
        joinedLabel: (0, users_security_1.formatJoined)(user.createdAt),
        lastActiveLabel: (0, users_security_1.formatWhen)(h),
        lastActiveHoursAgo: Math.round(h * 10) / 10,
        deviceId: install?.installId ?? '—',
        deviceLabel,
        appVersion: install?.appVersion || '—',
        coinBalance: user.coins,
        streakDays: user.streakDays,
        claimsCount: user._count.claims,
        redeemUnlocks: user._count.claims,
        ffUid: shown(user.ffUid),
        playRole: shown(user.playRole),
        regionLabel: shown(user.region),
        notifyPush: user.notifyPush,
        note: user.accountNote,
    };
}
//# sourceMappingURL=users-row.js.map