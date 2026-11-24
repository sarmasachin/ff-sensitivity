/** Economy admin form. Amounts persist on challenge config and drive app earn. */

export type EconomyEarnRules = {
  checkInCoins: number;
  quizCorrectCoins: number;
  quizWrongCoins: number;
  adBonusCoins: number;
};

export type EconomyLimits = {
  /** Max coins a wallet can hold (Android COINS_MAX). */
  walletCap: number;
  /** Soft daily earn ceiling; 0 = unlimited. */
  dailyEarnCap: number;
};

export type EconomyPremiumUnlock = {
  bestPremium: number;
  premiumProMax: number;
  oneTapPremium: number;
  /** Show “Unlock with coins” in the app. */
  coinUnlockEnabled: boolean;
  /** Show “Watch ad to unlock” in the app. */
  adUnlockEnabled: boolean;
};

export type EconomyConfig = {
  earn: EconomyEarnRules;
  limits: EconomyLimits;
  premiumUnlock: EconomyPremiumUnlock;
  /** Sources currently paying coins in the app. */
  checkInEnabled: boolean;
  quizEnabled: boolean;
  adBonusEnabled: boolean;
};

export type EconomyFormValues = {
  checkInCoins: string;
  quizCorrectCoins: string;
  quizWrongCoins: string;
  adBonusCoins: string;
  walletCap: string;
  dailyEarnCap: string;
  premiumUnlockBest: string;
  premiumUnlockProMax: string;
  premiumUnlockOneTap: string;
  premiumUnlockCoinEnabled: boolean;
  premiumUnlockAdEnabled: boolean;
  checkInEnabled: boolean;
  quizEnabled: boolean;
  adBonusEnabled: boolean;
};

export const ECONOMY_DEFAULTS: EconomyConfig = {
  earn: {
    checkInCoins: 20,
    quizCorrectCoins: 50,
    quizWrongCoins: 10,
    adBonusCoins: 30,
  },
  limits: {
    walletCap: 9_999_999,
    dailyEarnCap: 0,
  },
  premiumUnlock: {
    bestPremium: 100,
    premiumProMax: 200,
    oneTapPremium: 150,
    coinUnlockEnabled: true,
    adUnlockEnabled: true,
  },
  checkInEnabled: true,
  quizEnabled: true,
  adBonusEnabled: true,
};

export function configToForm(cfg: EconomyConfig): EconomyFormValues {
  const pu = cfg.premiumUnlock ?? ECONOMY_DEFAULTS.premiumUnlock;
  return {
    checkInCoins: String(cfg.earn.checkInCoins),
    quizCorrectCoins: String(cfg.earn.quizCorrectCoins),
    quizWrongCoins: String(cfg.earn.quizWrongCoins),
    adBonusCoins: String(cfg.earn.adBonusCoins),
    walletCap: String(cfg.limits.walletCap),
    dailyEarnCap:
      cfg.limits.dailyEarnCap === 0 ? "" : String(cfg.limits.dailyEarnCap),
    premiumUnlockBest: String(pu.bestPremium),
    premiumUnlockProMax: String(pu.premiumProMax),
    premiumUnlockOneTap: String(pu.oneTapPremium),
    premiumUnlockCoinEnabled: pu.coinUnlockEnabled ?? true,
    premiumUnlockAdEnabled: pu.adUnlockEnabled ?? true,
    checkInEnabled: cfg.checkInEnabled,
    quizEnabled: cfg.quizEnabled,
    adBonusEnabled: cfg.adBonusEnabled,
  };
}

function parseNonNegInt(raw: string, label: string): number | { error: string } {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return { error: `${label} must be a whole number ≥ 0.` };
  }
  return n;
}

export function formToConfig(
  values: EconomyFormValues,
): EconomyConfig | { error: string } {
  const checkIn = parseNonNegInt(values.checkInCoins, "Check-in");
  if (typeof checkIn === "object") return checkIn;
  const quizOk = parseNonNegInt(values.quizCorrectCoins, "Quiz correct");
  if (typeof quizOk === "object") return quizOk;
  const quizBad = parseNonNegInt(values.quizWrongCoins, "Quiz wrong");
  if (typeof quizBad === "object") return quizBad;
  const ad = parseNonNegInt(values.adBonusCoins, "Ad bonus");
  if (typeof ad === "object") return ad;
  const cap = parseNonNegInt(values.walletCap, "Wallet cap");
  if (typeof cap === "object") return cap;
  if (cap < 100) return { error: "Wallet cap should be at least 100." };

  const best = parseNonNegInt(values.premiumUnlockBest, "Best Premium unlock");
  if (typeof best === "object") return best;
  if (best > 100_000) {
    return { error: "Best Premium unlock must be ≤ 100,000." };
  }
  const proMax = parseNonNegInt(
    values.premiumUnlockProMax,
    "Premium Pro Max unlock",
  );
  if (typeof proMax === "object") return proMax;
  if (proMax > 100_000) {
    return { error: "Premium Pro Max unlock must be ≤ 100,000." };
  }
  const oneTap = parseNonNegInt(
    values.premiumUnlockOneTap,
    "One Tap Premium unlock",
  );
  if (typeof oneTap === "object") return oneTap;
  if (oneTap > 100_000) {
    return { error: "One Tap Premium unlock must be ≤ 100,000." };
  }
  if (!values.premiumUnlockCoinEnabled && !values.premiumUnlockAdEnabled) {
    return {
      error: "Enable at least one Premium unlock path (coins or watch ad).",
    };
  }

  const dailyRaw = values.dailyEarnCap.trim();
  let dailyEarnCap = 0;
  if (dailyRaw !== "") {
    const daily = parseNonNegInt(dailyRaw, "Daily earn cap");
    if (typeof daily === "object") return daily;
    dailyEarnCap = daily;
  }

  return {
    earn: {
      checkInCoins: checkIn,
      quizCorrectCoins: quizOk,
      quizWrongCoins: quizBad,
      adBonusCoins: ad,
    },
    limits: { walletCap: cap, dailyEarnCap },
    premiumUnlock: {
      bestPremium: best,
      premiumProMax: proMax,
      oneTapPremium: oneTap,
      coinUnlockEnabled: values.premiumUnlockCoinEnabled,
      adUnlockEnabled: values.premiumUnlockAdEnabled,
    },
    checkInEnabled: values.checkInEnabled,
    quizEnabled: values.quizEnabled,
    adBonusEnabled: values.adBonusEnabled,
  };
}

/** Max coins if user does every enabled source once (correct quiz). */
export function maxDailyEarn(cfg: EconomyConfig): number {
  let total = 0;
  if (cfg.checkInEnabled) total += cfg.earn.checkInCoins;
  if (cfg.quizEnabled) total += cfg.earn.quizCorrectCoins;
  if (cfg.adBonusEnabled) total += cfg.earn.adBonusCoins;
  if (cfg.limits.dailyEarnCap > 0) {
    return Math.min(total, cfg.limits.dailyEarnCap);
  }
  return total;
}

export function liveSourceCount(cfg: EconomyConfig): number {
  return [cfg.checkInEnabled, cfg.quizEnabled, cfg.adBonusEnabled].filter(
    Boolean,
  ).length;
}

export const ECONOMY_BOOST_NOTES = [
  {
    id: "boost_checkin_plus",
    title: "Check-in Plus",
    body: "Shop boost: next check-in +20 extra (stacks). Managed in Shop catalog.",
  },
  {
    id: "boost_quiz_double",
    title: "Quiz Double",
    body: "Shop boost: next correct quiz pays 2× base coins. Managed in Shop.",
  },
] as const;

export const ECONOMY_CAPABILITIES = [
  {
    title: "Daily earn amounts",
    body: "Remote override for check-in, quiz correct/wrong, and ad-bonus coins.",
  },
  {
    title: "Source toggles",
    body: "Disable a source without shipping an APK — check-in, quiz, or ad bonus.",
  },
  {
    title: "Wallet & daily caps",
    body: "Hard wallet ceiling and optional soft daily earn limit.",
  },
  {
    title: "Premium Sensi unlock prices",
    body: "Set coins for Best / Pro Max / One Tap unlock — app + server debit use these.",
  },
  {
    title: "Premium unlock paths",
    body: "Checkbox: show coin unlock, watch ad, or both in the Premium unlock dialog.",
  },
  {
    title: "Shop boosts",
    body: "Plus / 2× modifiers stay in Shop; Economy shows how they stack.",
  },
  {
    title: "Streak milestones",
    body: "Milestone coin payouts live under Challenge — Economy focuses on daily earn.",
  },
  {
    title: "Audit trail",
    body: "When API connects: who changed rates and when (staff / audit).",
  },
] as const;
