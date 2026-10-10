import {
  formatJoined,
  formatWhen,
  hoursAgo,
  mapAccountStatus,
  maskEmail,
  maskGoogleSub,
} from './users-security';

export const installSelect = {
  installId: true,
  userId: true,
  brand: true,
  model: true,
  androidVersion: true,
  appVersion: true,
  lastSeenAt: true,
} as const;

export const userListSelect = {
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
    orderBy: { lastSeenAt: 'desc' as const },
    take: 1,
    select: installSelect,
  },
} as const;

type Install = {
  installId: string;
  userId: string | null;
  brand: string;
  model: string;
  androidVersion: string;
  appVersion: string;
  lastSeenAt: Date;
};

export type UserListSource = {
  id: string;
  email: string;
  displayName: string;
  googleName: string;
  photoUrl: string | null;
  ffUid: string;
  playRole: string;
  region: string;
  notifyPush: boolean;
  streakDays: number;
  googleSub: string;
  coins: number;
  isActive: boolean;
  isRestricted: boolean;
  dataDeletedAt: Date | null;
  accountNote: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  _count: { claims: number };
  deviceInstalls: Install[];
};

function shown(value: string): string {
  const text = value.trim();
  return text || '—';
}

export function toUserRow(user: UserListSource, now = new Date()) {
  const install = user.deviceInstalls[0];
  const ownsInstall = Boolean(install?.userId && install.userId === user.id);
  const activityAt =
    ownsInstall &&
    install.lastSeenAt &&
    (!user.lastLoginAt || install.lastSeenAt > user.lastLoginAt)
      ? install.lastSeenAt
      : (user.lastLoginAt ?? user.createdAt);
  const h = hoursAgo(activityAt, now);
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
    email: maskEmail(user.email),
    googleSubMasked: maskGoogleSub(user.googleSub),
    status: mapAccountStatus(user.isActive, user.isRestricted, user.dataDeletedAt),
    joinedLabel: formatJoined(user.createdAt),
    lastActiveLabel: formatWhen(h),
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
