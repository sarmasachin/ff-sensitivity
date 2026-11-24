export type ProMaxShareConflictKnobs = {
    softGap: number;
    hardGap: number;
    maxShrink: number;
};
export type ProMaxConfigBundle = {
    shareConflict: ProMaxShareConflictKnobs;
};
export declare const DEFAULT_PROMAX_CONFIG: ProMaxConfigBundle;
export declare function normalizeProMaxConfig(raw: unknown): ProMaxConfigBundle;
export declare function assertProMaxConfigForSave(raw: unknown): ProMaxConfigBundle;
