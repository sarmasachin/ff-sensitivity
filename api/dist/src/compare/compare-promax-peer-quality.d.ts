export type PeerOffsetRow = {
    userId: string;
    deviceLabel: string;
    feedback: string;
    createdAt: Date;
    general: number;
    redDot: number;
    scope2x: number;
    scope4x: number;
    sniper: number;
    freeLook: number;
    fireButton: number;
};
export type PeerFieldOffsets = {
    general: number;
    redDot: number;
    scope2x: number;
    scope4x: number;
    sniper: number;
    freeLook: number;
    fireButton: number;
};
export type FieldAgreement = {
    general: number;
    redDot: number;
    scope2x: number;
    scope4x: number;
    sniper: number;
    freeLook: number;
    fireButton: number;
};
export declare function feedbackWeight(feedback: string): number;
export declare function dedupePeersByUser(rows: PeerOffsetRow[]): PeerOffsetRow[];
export declare function feedbackSignConsistent(row: PeerOffsetRow): boolean;
export declare function recencyWeight(createdAt: Date, nowMs: number): number;
export declare function isOutlierPeer(row: PeerOffsetRow): boolean;
export declare function confidenceScale(n: number): number;
export declare function computeWeightedOffsets(rows: PeerOffsetRow[], nowMs?: number): {
    n: number;
    offsets: PeerFieldOffsets;
    confidence: number;
    fieldAgreement: FieldAgreement;
};
