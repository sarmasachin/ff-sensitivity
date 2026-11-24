export declare const PROFILE_ROLES: readonly ["Rusher", "One-Tap Headshot", "Sniper", "Flanker"];
export declare const PROFILE_REGIONS: readonly ["India", "Brazil", "Middle East", "Singapore", "Indonesia", "North America", "Europe", "Latin America"];
export declare function cleanDisplayName(raw: string): string;
export declare function cleanFfUid(raw: string): string | null;
export declare function cleanChoice(raw: string, allowed: readonly string[]): string | null;
export declare function cleanRegion(raw: string): string | null;
