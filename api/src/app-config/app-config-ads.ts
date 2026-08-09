import { AppError } from '../common/errors/app-error';
import { assertSafeText, sanitizeText } from './app-config-security';

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
    incompleteMessage: 'Watch the full ad to see your settings.',
    buttonLabel: 'Calculate Best Pro Settings \u00b7 Watch Ad',
  },
  dpi: {
    enabled: true,
    cooldownHours: 24,
    incompleteMessage:
      'Watch the full ad to see your DPI & Resolution result.',
    buttonLabel: 'DPI & Resolution Result \u00b7 Watch Ad',
  },
  quiz: {
    enabled: true,
    cooldownHours: 24,
    incompleteMessage: 'Watch the ad to submit the quiz.',
    buttonLabel: 'Submit Answer \u00b7 Watch Ad',
  },
  secondChance: {
    enabled: true,
    cooldownHours: 0,
    incompleteMessage: 'Watch the full ad to unlock a new question.',
    buttonLabel: 'Watch Ad for New Question',
  },
  adBonus: {
    enabled: true,
    cooldownHours: 4,
    incompleteMessage: 'Watch the full ad to claim bonus coins.',
    buttonLabel: 'Watch Ad for Bonus Coins',
  },
  checkIn: {
    enabled: true,
    cooldownHours: 24,
    incompleteMessage: 'Watch the ad to claim check-in.',
    buttonLabel: 'Collect +20 \u00b7 Watch Ad',
  },
  redeemDaily: {
    enabled: true,
    cooldownHours: 24,
    incompleteMessage: 'Watch the ad to open today’s redeem card.',
    buttonLabel: 'Redeem Now \u00b7 Watch Ad',
  },
};

function asRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function clampHours(raw: unknown, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(168, Math.max(0, Math.trunc(n)));
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
  return {
    enabled:
      typeof calc.enabled === 'boolean' ? calc.enabled : defaults.enabled,
    cooldownHours: clampHours(calc.cooldownHours, defaults.cooldownHours),
    incompleteMessage: incompleteMessage || defaults.incompleteMessage,
    buttonLabel: buttonLabel || defaults.buttonLabel,
  };
}

export function normalizeAdsConfig(raw: unknown): AdsConfigBundle {
  const root = asRecord(raw);
  return {
    calculate: normalizePlacement(root.calculate, DEFAULT_ADS_CONFIG.calculate),
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
  placement: AdPlacementConfig,
  code: string,
  label: string,
) {
  if (!placement.incompleteMessage) {
    throw new AppError(code, `${label}: incomplete-ad message is required.`, 400);
  }
  if (!placement.buttonLabel) {
    throw new AppError(code, `${label}: button label is required.`, 400);
  }
  assertSafeText(placement.incompleteMessage, `${label} incomplete-ad message`);
  assertSafeText(placement.buttonLabel, `${label} button label`);
}

/** Strict validate for admin PUT — rejects blank labels after sanitize. */
export function assertAdsConfigForSave(raw: unknown): AdsConfigBundle {
  const normalized = normalizeAdsConfig(raw);
  assertPlacement(normalized.calculate, 'ADS_BAD_CALCULATE', 'Calculate');
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
