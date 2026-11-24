export declare const installSelect: {
    readonly installId: true;
    readonly userId: true;
    readonly brand: true;
    readonly model: true;
    readonly androidVersion: true;
    readonly appVersion: true;
    readonly lastSeenAt: true;
};
export declare const userListSelect: {
    readonly id: true;
    readonly email: true;
    readonly displayName: true;
    readonly googleName: true;
    readonly photoUrl: true;
    readonly ffUid: true;
    readonly playRole: true;
    readonly region: true;
    readonly notifyPush: true;
    readonly streakDays: true;
    readonly googleSub: true;
    readonly coins: true;
    readonly isActive: true;
    readonly isRestricted: true;
    readonly dataDeletedAt: true;
    readonly accountNote: true;
    readonly createdAt: true;
    readonly lastLoginAt: true;
    readonly _count: {
        readonly select: {
            readonly claims: true;
        };
    };
    readonly deviceInstalls: {
        readonly orderBy: {
            readonly lastSeenAt: "desc";
        };
        readonly take: 1;
        readonly select: {
            readonly installId: true;
            readonly userId: true;
            readonly brand: true;
            readonly model: true;
            readonly androidVersion: true;
            readonly appVersion: true;
            readonly lastSeenAt: true;
        };
    };
};
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
    _count: {
        claims: number;
    };
    deviceInstalls: Install[];
};
export declare function toUserRow(user: UserListSource, now?: Date): {
    id: string;
    displayName: string;
    googleName: string;
    photoUrl: string | null;
    email: string;
    googleSubMasked: string;
    status: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "DELETED";
    joinedLabel: string;
    lastActiveLabel: string;
    lastActiveHoursAgo: number;
    deviceId: string;
    deviceLabel: string;
    appVersion: string;
    coinBalance: number;
    streakDays: number;
    claimsCount: number;
    redeemUnlocks: number;
    ffUid: string;
    playRole: string;
    regionLabel: string;
    notifyPush: boolean;
    note: string;
};
export {};
