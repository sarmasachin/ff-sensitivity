export declare const REDEEM_SCRATCH_SAFE_TIP = "Scratch to earn Coins. Limited reward codes distributed via schedule.";
export declare function assertScratchAttemptKey(raw: string): string;
export declare function scratchWindowIndex(startsAt: Date, windowMinutes: number, now: Date): number;
export declare function scratchWindowRange(startsAt: Date, windowMinutes: number, now: Date): {
    index: number;
    start: Date;
    end: Date;
} | null;
export declare function rollScratchCoins(min: number, max: number): number;
export declare function isScratchCooldownActive(lastScratchAt: Date, windowMinutes: number, now: Date): boolean;
export declare function scratchCodeWinChance(opts: {
    remainingSlots: number;
    scratchesInWindow: number;
    remainingMs: number;
}): number;
export declare function shouldAwardScratchCode(opts: {
    remainingSlots: number;
    scratchesInWindow: number;
    remainingMs: number;
}, rng?: () => number): boolean;
