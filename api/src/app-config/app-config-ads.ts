import { AppError } from '../common/errors/app-error';
import { assertSafeText, sanitizeText } from './app-config-security';

/** Max cooldown = 7 days. */
export const MAX_AD_COOLDOWN_MINUTES = 168 * 60;

export type AdPlacementConfig = {
  enabled: boolean;
  /** Source of truth for “how many minutes until this ad can show again”. */
  cooldownMinutes: number;
  /** Legacy field for older app builds (ceil(minutes/60); 0 stays 0). */
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

export function clampAdCooldownMinutes(
  raw: unknown,
  fallback: number,
): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_AD_COOLDOWN_MINUTES, Math.max(0, Math.trunc(n)));
}

/** Older clients only read hours — never under-report a non-zero minute cooldown. */
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
    'Watch the full ad to see your settings.',
    'Calculate Best Pro Settings \u00b7 Watch Ad',
  ),
  premium: placement(
    true,
    24 * 60,
    'Watch the full ad to unlock Premium Pro settings.',
    'Premium Pro Settings \u00b7 Watch Ad',
  ),
  dpi: placement(
    true,
    24 * 60,
    'Watch the full ad to see your DPI & Resolution result.',
    'DPI & Resolution Result \u00b7 Watch Ad',
  ),
  quiz: placement(
    true,
    24 * 60,
    'Watch the ad to submit the quiz.',
    'Submit Answer \u00b7 Watch Ad',
  ),
  secondChance: placement(
    true,
    0,
    'Watch the full ad to unlock a new question.',
    'Watch Ad for New Question',
  ),
  adBonus: placement(
    true,
    4 * 60,
    'Watch the full ad to claim bonus coins.',
    'Watch Ad for Bonus Coins',
  ),
  checkIn: placement(
    true,
    24 * 60,
    'Watch the ad to claim check-in.',
    'Collect +20 \u00b7 Watch Ad',
  ),
  redeemDaily: placement(
    true,
    24 * 60,
    'Watch the ad to open today’s redeem card.',
    'Redeem Now \u00b7 Watch Ad',
  ),
};

function asRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function resolveMinutes(
  calc: Record<string, unknown>,
  defaults: AdPlacementConfig,
): number {
  if (calc.cooldownMinutes !== undefined && calc.cooldownMinutes !== null) {
    return clampAdCooldownMinutes(
      calc.cooldownMinutes,
      defaults.cooldownMinutes,
    );
  }
  if (calc.cooldownHours !== undefined && calc.cooldownHours !== null) {
    const hours = clampAdCooldownMinutes(
      Number(calc.cooldownHours) * 60,
      defaults.cooldownMinutes,
    );
    return hours;
  }
  return defaults.cooldownMinutes;
}

function normalizePlacement(
  raw: unknown,
  defaults: AdPlacementConfig,
): AdPlacementConfig {
  const calc = asRecord(raw);
  const incompleteMessage = sanitizeText(
    typeof calc.incompleteMessage === 'string'
      ? calc.incompleteMessage
      : defaults.incompleteMessage,
    200,
  );
  const buttonLabel = sanitizeText(
    typeof calc.buttonLabel === 'string' ? calc.buttonLabel : defaults.buttonLabel,
    200,
  );
  const cooldownMinutes = resolveMinutes(calc, defaults);
  return {
    enabled:
      typeof calc.enabled === 'boolean' ? calc.enabled : defaults.enabled,
    cooldownMinutes,
    cooldownHours: legacyHoursFromMinutes(cooldownMinutes),
    incompleteMessage: incompleteMessage || defaults.incompleteMessage,
    buttonLabel: buttonLabel || defaults.buttonLabel,
  };
}

export function normalizeAdsConfig(raw: unknown): AdsConfigBundle {
  const root = asRecord(raw);
  return {
    calculate: normalizePlacement(root.calculate, DEFAULT_ADS_CONFIG.calculate),
    premium: normalizePlacement(root.premium, DEFAULT_ADS_CONFIG.premium),
    dpi: normalizePlacement(root.dpi, DEFAULT_ADS_CONFIG.dpi),
    quiz: normalizePlacement(root.quiz, DEFAULT_ADS_CONFIG.quiz),
    secondChance: normalizePlacement(
      root.secondChance,
      DEFAULT_ADS_CONFIG.secondChance,
    ),
    adBonus: normalizePlacement(root.adBonus, DEFAULT_ADS_CONFIG.adBonus),
    checkIn: normalizePlacement(root.checkIn, DEFAULT_ADS_CONFIG.checkIn),
    redeemDaily: normalizePlacement(
      root.redeemDaily,
      DEFAULT_ADS_CONFIG.redeemDaily,
    ),
  };
}

function assertPlacement(
  placementCfg: AdPlacementConfig,
  code: string,
  label: string,
) {
  if (!placementCfg.incompleteMessage) {
    throw new AppError(code, `${label}: incomplete-ad message is required.`, 400);
  }
  if (!placementCfg.buttonLabel) {
    throw new AppError(code, `${label}: button label is required.`, 400);
  }
  assertSafeText(
    placementCfg.incompleteMessage,
    `${label} incomplete-ad message`,
  );
  assertSafeText(placementCfg.buttonLabel, `${label} button label`);
}

/** Strict validate for admin PUT — rejects blank labels after sanitize. */
export function assertAdsConfigForSave(raw: unknown): AdsConfigBundle {
  const normalized = normalizeAdsConfig(raw);
  assertPlacement(normalized.calculate, 'ADS_BAD_CALCULATE', 'Calculate');
  assertPlacement(normalized.premium, 'ADS_BAD_PREMIUM', 'Premium Pro');
  assertPlacement(normalized.dpi, 'ADS_BAD_DPI', 'DPI');
  assertPlacement(normalized.quiz, 'ADS_BAD_QUIZ', 'Quiz');
  assertPlacement(
    normalized.secondChance,
    'ADS_BAD_SECOND_CHANCE',
    'Second chance',
  );
  assertPlacement(normalized.adBonus, 'ADS_BAD_AD_BONUS', 'Watch Ad Bonus');
  assertPlacement(normalized.checkIn, 'ADS_BAD_CHECK_IN', 'Check-in');
  assertPlacement(
    normalized.redeemDaily,
    'ADS_BAD_REDEEM_DAILY',
    'Redeem Daily',
  );
  return normalized;
}
