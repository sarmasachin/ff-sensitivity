export type AdPlacementConfig = {
  enabled: boolean;
  cooldownHours: number;
  incompleteMessage: string;
  buttonLabel: string;
};

export type AdsConfigBundle = {
  calculate: AdPlacementConfig;
  dpi: AdPlacementConfig;
  quiz: AdPlacementConfig;
  secondChance: AdPlacementConfig;
  adBonus: AdPlacementConfig;
  checkIn: AdPlacementConfig;
  redeemDaily: AdPlacementConfig;
};

export const DEFAULT_ADS_CONFIG: AdsConfigBundle = {
  calculate: {
    enabled: true,
    cooldownHours: 24,
    incompleteMessage: "Watch the full ad to see your settings.",
    buttonLabel: "Calculate Best Pro Settings · Watch Ad",
  },
  dpi: {
    enabled: true,
    cooldownHours: 24,
    incompleteMessage:
      "Watch the full ad to see your DPI & Resolution result.",
    buttonLabel: "DPI & Resolution Result · Watch Ad",
  },
  quiz: {
    enabled: true,
    cooldownHours: 24,
    incompleteMessage: "Watch the ad to submit the quiz.",
    buttonLabel: "Submit Answer · Watch Ad",
  },
  secondChance: {
    enabled: true,
    cooldownHours: 0,
    incompleteMessage: "Watch the full ad to unlock a new question.",
    buttonLabel: "Watch Ad for New Question",
  },
  adBonus: {
    enabled: true,
    cooldownHours: 4,
    incompleteMessage: "Watch the full ad to claim bonus coins.",
    buttonLabel: "Watch Ad for Bonus Coins",
  },
  checkIn: {
    enabled: true,
    cooldownHours: 24,
    incompleteMessage: "Watch the ad to claim check-in.",
    buttonLabel: "Collect +20 · Watch Ad",
  },
  redeemDaily: {
    enabled: true,
    cooldownHours: 24,
    incompleteMessage: "Watch the ad to open today’s redeem card.",
    buttonLabel: "Redeem Now · Watch Ad",
  },
};

export function cloneAdsConfig(
  source: AdsConfigBundle = DEFAULT_ADS_CONFIG,
): AdsConfigBundle {
  return {
    calculate: { ...source.calculate },
    dpi: { ...(source.dpi ?? DEFAULT_ADS_CONFIG.dpi) },
    quiz: { ...(source.quiz ?? DEFAULT_ADS_CONFIG.quiz) },
    secondChance: {
      ...(source.secondChance ?? DEFAULT_ADS_CONFIG.secondChance),
    },
    adBonus: { ...(source.adBonus ?? DEFAULT_ADS_CONFIG.adBonus) },
    checkIn: { ...(source.checkIn ?? DEFAULT_ADS_CONFIG.checkIn) },
    redeemDaily: {
      ...(source.redeemDaily ?? DEFAULT_ADS_CONFIG.redeemDaily),
    },
  };
}

function validatePlacement(
  c: AdPlacementConfig,
  name: string,
): string | null {
  if (!Number.isFinite(c.cooldownHours)) {
    return `${name}: cooldown hours must be a number.`;
  }
  if (c.cooldownHours < 0 || c.cooldownHours > 168) {
    return `${name}: cooldown hours must be between 0 and 168.`;
  }
  if (!c.incompleteMessage.trim()) {
    return `${name}: incomplete-ad message is required.`;
  }
  if (c.incompleteMessage.trim().length > 200) {
    return `${name}: incomplete-ad message max 200 characters.`;
  }
  if (!c.buttonLabel.trim()) {
    return `${name}: button label is required.`;
  }
  if (c.buttonLabel.trim().length > 200) {
    return `${name}: button label max 200 characters.`;
  }
  return null;
}

export function validateAdsConfig(config: AdsConfigBundle): string | null {
  return (
    validatePlacement(config.calculate, "Calculate") ??
    validatePlacement(config.dpi ?? DEFAULT_ADS_CONFIG.dpi, "DPI") ??
    validatePlacement(config.quiz ?? DEFAULT_ADS_CONFIG.quiz, "Quiz") ??
    validatePlacement(
      config.secondChance ?? DEFAULT_ADS_CONFIG.secondChance,
      "Second chance",
    ) ??
    validatePlacement(config.adBonus ?? DEFAULT_ADS_CONFIG.adBonus, "Ad Bonus") ??
    validatePlacement(config.checkIn ?? DEFAULT_ADS_CONFIG.checkIn, "Check-in") ??
    validatePlacement(
      config.redeemDaily ?? DEFAULT_ADS_CONFIG.redeemDaily,
      "Redeem Daily",
    )
  );
}

/** Challenge server requires ad-bonus cooldown ≥ 1 hour. */
export function challengeCooldownFromAdBonus(hours: number): number {
  const n = Math.trunc(Number(hours));
  if (!Number.isFinite(n)) return 4;
  return Math.min(168, Math.max(1, n));
}
