export declare const REDEEM_SCRATCH_SAFE_TIP = "Scratch to earn Coins. Limited reward codes distributed via schedule.";
export declare function assertScratchAttemptKey(raw: string): string;
export declare function scratchWindowIndex(startsAt: Date, windowMinutes: number, now: Date): number;
export declare function rollScratchCoins(min: number, max: number): number;
