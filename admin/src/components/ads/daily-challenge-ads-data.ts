export type DailyChallengeAdsState = {
  wrongAnswerLockMinutes: number;
};

export const DEFAULT_DAILY_CHALLENGE_ADS: DailyChallengeAdsState = {
  wrongAnswerLockMinutes: 20,
};

export function validateDailyChallengeAds(
  state: DailyChallengeAdsState,
): string | null {
  if (!Number.isFinite(state.wrongAnswerLockMinutes)) {
    return "Daily Challenge: lock minutes must be a number.";
  }
  if (
    state.wrongAnswerLockMinutes < 1 ||
    state.wrongAnswerLockMinutes > 1440
  ) {
    return "Daily Challenge: lock minutes must be 1–1440.";
  }
  return null;
}
