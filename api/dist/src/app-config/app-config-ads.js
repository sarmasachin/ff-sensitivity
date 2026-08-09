"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ADS_CONFIG = void 0;
exports.normalizeAdsConfig = normalizeAdsConfig;
exports.assertAdsConfigForSave = assertAdsConfigForSave;
const app_error_1 = require("../common/errors/app-error");
const app_config_security_1 = require("./app-config-security");
exports.DEFAULT_ADS_CONFIG = {
    calculate: {
        enabled: true,
        cooldownHours: 24,
        incompleteMessage: 'Watch the full ad to see your settings.',
        buttonLabel: 'Calculate Best Pro Settings \u00b7 Watch Ad',
    },
    dpi: {
        enabled: true,
        cooldownHours: 24,
        incompleteMessage: 'Watch the full ad to see your DPI & Resolution result.',
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
function asRecord(raw) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return raw;
    }
    return {};
}
function clampHours(raw, fallback) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(168, Math.max(0, Math.trunc(n)));
}
function normalizePlacement(raw, defaults) {
    const calc = asRecord(raw);
    const incompleteMessage = (0, app_config_security_1.sanitizeText)(typeof calc.incompleteMessage === 'string'
        ? calc.incompleteMessage
        : defaults.incompleteMessage, 200);
    const buttonLabel = (0, app_config_security_1.sanitizeText)(typeof calc.buttonLabel === 'string' ? calc.buttonLabel : defaults.buttonLabel, 200);
    return {
        enabled: typeof calc.enabled === 'boolean' ? calc.enabled : defaults.enabled,
        cooldownHours: clampHours(calc.cooldownHours, defaults.cooldownHours),
        incompleteMessage: incompleteMessage || defaults.incompleteMessage,
        buttonLabel: buttonLabel || defaults.buttonLabel,
    };
}
function normalizeAdsConfig(raw) {
    const root = asRecord(raw);
    return {
        calculate: normalizePlacement(root.calculate, exports.DEFAULT_ADS_CONFIG.calculate),
        dpi: normalizePlacement(root.dpi, exports.DEFAULT_ADS_CONFIG.dpi),
        quiz: normalizePlacement(root.quiz, exports.DEFAULT_ADS_CONFIG.quiz),
        secondChance: normalizePlacement(root.secondChance, exports.DEFAULT_ADS_CONFIG.secondChance),
        adBonus: normalizePlacement(root.adBonus, exports.DEFAULT_ADS_CONFIG.adBonus),
        checkIn: normalizePlacement(root.checkIn, exports.DEFAULT_ADS_CONFIG.checkIn),
        redeemDaily: normalizePlacement(root.redeemDaily, exports.DEFAULT_ADS_CONFIG.redeemDaily),
    };
}
function assertPlacement(placement, code, label) {
    if (!placement.incompleteMessage) {
        throw new app_error_1.AppError(code, `${label}: incomplete-ad message is required.`, 400);
    }
    if (!placement.buttonLabel) {
        throw new app_error_1.AppError(code, `${label}: button label is required.`, 400);
    }
    (0, app_config_security_1.assertSafeText)(placement.incompleteMessage, `${label} incomplete-ad message`);
    (0, app_config_security_1.assertSafeText)(placement.buttonLabel, `${label} button label`);
}
function assertAdsConfigForSave(raw) {
    const normalized = normalizeAdsConfig(raw);
    assertPlacement(normalized.calculate, 'ADS_BAD_CALCULATE', 'Calculate');
    assertPlacement(normalized.dpi, 'ADS_BAD_DPI', 'DPI');
    assertPlacement(normalized.quiz, 'ADS_BAD_QUIZ', 'Quiz');
    assertPlacement(normalized.secondChance, 'ADS_BAD_SECOND_CHANCE', 'Second chance');
    assertPlacement(normalized.adBonus, 'ADS_BAD_AD_BONUS', 'Watch Ad Bonus');
    assertPlacement(normalized.checkIn, 'ADS_BAD_CHECK_IN', 'Check-in');
    assertPlacement(normalized.redeemDaily, 'ADS_BAD_REDEEM_DAILY', 'Redeem Daily');
    return normalized;
}
//# sourceMappingURL=app-config-ads.js.map