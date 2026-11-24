export const MAX_AD_COOLDOWN_MINUTES = 168 * 60;

export type AdPlacementConfig = {
  enabled: boolean;
  /** Minutes until this ad can show again (0 = every time). */
  cooldownMinutes: number;
  /** Legacy hours — kept in sync for older APIs/clients. */
  cooldownHours: number;
  incompleteMessage: string;
  buttonLabel: string;
};

export type AdsConfigBundle = {
  calculate: AdPlacementConfig;
  /** Best / Pro Max / One Tap unlock + paid wizard gate. */
  premium: AdPlacementConfig;
  dpi: AdPlacementConfig;
  quiz: AdPlacementConfig;
  secondChance: AdPlacementConfig;
  adBonus: AdPlacementConfig;
  checkIn: AdPlacementConfig;
  redeemDaily: AdPlacementConfig;
};

export function clampAdCooldownMinutes(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_AD_COOLDOWN_MINUTES, Math.max(0, Math.trunc(n)));
}

export function legacyHoursFromMinutes(minutes: number): number {
  const m = clampAdCooldownMinutes(minutes, 0);
  if (m <= 0) return 0;
  return Math.min(168, Math.max(1, Math.ceil(m / 60)));
}

function placement(
  enabled: boolean,
  cooldownMinutes: number,
  incompleteMessage: string,
  buttonLabel: string,
): AdPlacementConfig {
  const mins = clampAdCooldownMinutes(cooldownMinutes, 0);
  return {
    enabled,
    cooldownMinutes: mins,
    cooldownHours: legacyHoursFromMinutes(mins),
    incompleteMessage,
    buttonLabel,
  };
}

export const DEFAULT_ADS_CONFIG: AdsConfigBundle = {
  calculate: placement(
    true,
    24 * 60,
    "Watch the full ad to see your settings.",
    "Calculate Best Pro Settings · Watch Ad",
  ),
  premium: placement(
    true,
    24 * 60,
    "Watch the full ad to unlock Premium Pro settings.",
    "Premium Pro Settings · Watch Ad",
  ),
  dpi: placement(
    true,
    24 * 60,
    "Watch the full ad to see your DPI & Resolution result.",
    "DPI & Resolution Result · Watch Ad",
  ),
  quiz: placement(
    true,
    24 * 60,
    "Watch the ad to submit the quiz.",
    "Submit Answer · Watch Ad",
  ),
  secondChance: placement(
    true,
    0,
    "Watch the full ad to unlock a new question.",
    "Watch Ad for New Question",
  ),
  adBonus: placement(
    true,
    4 * 60,
    "Watch the full ad to claim bonus coins.",
    "Watch Ad for Bonus Coins",
  ),
  checkIn: placement(
    true,
    24 * 60,
    "Watch the ad to claim check-in.",
    "Collect +20 · Watch Ad",
  ),
  redeemDaily: placement(
    true,
    24 * 60,
    "Watch the ad to open today’s redeem card.",
    "Redeem Now · Watch Ad",
  ),
};

function normalizePlacement(
  source: Partial<AdPlacementConfig> | undefined,
  fallback: AdPlacementConfig,
): AdPlacementConfig {
  const raw = source ?? fallback;
  let mins: number;
  if (raw.cooldownMinutes != null && Number.isFinite(Number(raw.cooldownMinutes))) {
    mins = clampAdCooldownMinutes(raw.cooldownMinutes, fallback.cooldownMinutes);
  } else if (raw.cooldownHours != null && Number.isFinite(Number(raw.cooldownHours))) {
    mins = clampAdCooldownMinutes(
      Number(raw.cooldownHours) * 60,
      fallback.cooldownMinutes,
    );
  } else {
    mins = fallback.cooldownMinutes;
  }
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
    cooldownMinutes: mins,
    cooldownHours: legacyHoursFromMinutes(mins),
    incompleteMessage:
      typeof raw.incompleteMessage === "string" && raw.incompleteMessage.trim()
        ? raw.incompleteMessage
        : fallback.incompleteMessage,
    buttonLabel:
      typeof raw.buttonLabel === "string" && raw.buttonLabel.trim()
        ? raw.buttonLabel
        : fallback.buttonLabel,
  };
}

export function cloneAdsConfig(
  source: AdsConfigBundle = DEFAULT_ADS_CONFIG,
): AdsConfigBundle {
  return {
    calculate: normalizePlacement(source.calculate, DEFAULT_ADS_CONFIG.calculate),
    premium: normalizePlacement(source.premium, DEFAULT_ADS_CONFIG.premium),
    dpi: normalizePlacement(source.dpi, DEFAULT_ADS_CONFIG.dpi),
    quiz: normalizePlacement(source.quiz, DEFAULT_ADS_CONFIG.quiz),
    secondChance: normalizePlacement(
      source.secondChance,
      DEFAULT_ADS_CONFIG.secondChance,
    ),
    adBonus: normalizePlacement(source.adBonus, DEFAULT_ADS_CONFIG.adBonus),
    checkIn: normalizePlacement(source.checkIn, DEFAULT_ADS_CONFIG.checkIn),
    redeemDaily: normalizePlacement(
      source.redeemDaily,
      DEFAULT_ADS_CONFIG.redeemDaily,
    ),
  };
}

function validatePlacement(
  c: AdPlacementConfig,
  name: string,
): string | null {
  if (!Number.isFinite(c.cooldownMinutes)) {
    return `${name}: cooldown minutes must be a number.`;
  }
  if (c.cooldownMinutes < 0 || c.cooldownMinutes > MAX_AD_COOLDOWN_MINUTES) {
    return `${name}: cooldown minutes must be between 0 and ${MAX_AD_COOLDOWN_MINUTES}.`;
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
    validatePlacement(
      config.premium ?? DEFAULT_ADS_CONFIG.premium,
      "Premium Pro",
    ) ??
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

/** Challenge sync: keep minutes exact (0 allowed). */
export function challengeCooldownMinutesFromAdBonus(minutes: number): number {
  return clampAdCooldownMinutes(minutes, 240);
}

/** @deprecated use challengeCooldownMinutesFromAdBonus */
export function challengeCooldownFromAdBonus(hours: number): number {
  const n = Math.trunc(Number(hours));
  if (!Number.isFinite(n)) return 4;
  return Math.min(168, Math.max(0, n));
}
