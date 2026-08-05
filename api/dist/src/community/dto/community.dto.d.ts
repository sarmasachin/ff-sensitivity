export declare const COMMUNITY_RANKS: readonly ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Heroic"];
export declare const COMMUNITY_ROLES: readonly ["Rusher", "Sniper", "Entry", "Support", "Mixed"];
export declare const COMMUNITY_STATUSES: readonly ["PENDING", "APPROVED", "FEATURED", "HIDDEN"];
export declare class SubmitCommunityPostDto {
    name: string;
    freeFireId: string;
    rank: (typeof COMMUNITY_RANKS)[number];
    role: (typeof COMMUNITY_ROLES)[number];
    deviceLabel: string;
    deviceMeta?: string;
    matches: number;
    kills: number;
    headshots: number;
    general: number;
    redDot: number;
    scope2x: number;
    scope4x: number;
    awm: number;
    freeLook: number;
}
export declare class UpdateCommunityStatusDto {
    status: (typeof COMMUNITY_STATUSES)[number];
}
