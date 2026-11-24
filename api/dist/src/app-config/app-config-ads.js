"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ADS_CONFIG = exports.MAX_AD_COOLDOWN_MINUTES = void 0;
exports.clampAdCooldownMinutes = clampAdCooldownMinutes;
exports.legacyHoursFromMinutes = legacyHoursFromMinutes;
exports.normalizeAdsConfig = normalizeAdsConfig;
exports.assertAdsConfigForSave = assertAdsConfigForSave;
const app_error_1 = require("../common/errors/app-error");
const app_config_security_1 = require("./app-config-security");
exports.MAX_AD_COOLDOWN_MINUTES = 168 * 60;
function clampAdCooldownMinutes(raw, fallback) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(exports.MAX_AD_COOLDOWN_MINUTES, Math.max(0, Math.trunc(n)));
}
function legacyHoursFromMinutes(minutes) {
    const m = clampAdCooldownMinutes(minutes, 0);
    if (m <= 0)
        return 0;
    return Math.min(168, Math.max(1, Math.ceil(m / 60)));
}
function placement(enabled, cooldownMinutes, incompleteMessage, buttonLabel) {
    const mins = clampAdCooldownMinutes(cooldownMinutes, 0);
    return {
        enabled,
        cooldownMinutes: mins,
        cooldownHours: legacyHoursFromMinutes(mins),
        incompleteMessage,
        buttonLabel,
    };
}
exports.DEFAULT_ADS_CONFIG = {
    calculate: placement(true, 24 * 60, 'Watch the full ad to see your settings.', 'Calculate Best Pro Settings \u00b7 Watch Ad'),
    premium: placement(true, 24 * 60, 'Watch the full ad to unlock Premium Pro settings.', 'Premium Pro Settings \u00b7 Watch Ad'),
    dpi: placement(true, 24 * 60, 'Watch the full ad to see your DPI & Resolution result.', 'DPI & Resolution Result \u00b7 Watch Ad'),
    quiz: placement(true, 24 * 60, 'Watch the ad to submit the quiz.', 'Submit Answer \u00b7 Watch Ad'),
    secondChance: placement(true, 0, 'Watch the full ad to unlock a new question.', 'Watch Ad for New Question'),
    adBonus: placement(true, 4 * 60, 'Watch the full ad to claim bonus coins.', 'Watch Ad for Bonus Coins'),
    checkIn: placement(true, 24 * 60, 'Watch the ad to claim check-in.', 'Collect +20 \u00b7 Watch Ad'),
    redeemDaily: placement(true, 24 * 60, 'Watch the ad to open today’s redeem card.', 'Redeem Now \u00b7 Watch Ad'),
};
function asRecord(raw) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return raw;
    }
    return {};
}
function resolveMinutes(calc, defaults) {
    if (calc.cooldownMinutes !== undefined && calc.cooldownMinutes !== null) {
        return clampAdCooldownMinutes(calc.cooldownMinutes, defaults.cooldownMinutes);
    }
    if (calc.cooldownHours !== undefined && calc.cooldownHours !== null) {
        const hours = clampAdCooldownMinutes(Number(calc.cooldownHours) * 60, defaults.cooldownMinutes);
        return hours;
    }
    return defaults.cooldownMinutes;
}
function normalizePlacement(raw, defaults) {
    const calc = asRecord(raw);
    const incompleteMessage = (0, app_config_security_1.sanitizeText)(typeof calc.incompleteMessage === 'string'
        ? calc.incompleteMessage
        : defaults.incompleteMessage, 200);
    const buttonLabel = (0, app_config_security_1.sanitizeText)(typeof calc.buttonLabel === 'string' ? calc.buttonLabel : defaults.buttonLabel, 200);
    const cooldownMinutes = resolveMinutes(calc, defaults);
    return {
        enabled: typeof calc.enabled === 'boolean' ? calc.enabled : defaults.enabled,
        cooldownMinutes,
        cooldownHours: legacyHoursFromMinutes(cooldownMinutes),
        incompleteMessage: incompleteMessage || defaults.incompleteMessage,
        buttonLabel: buttonLabel || defaults.buttonLabel,
    };
}
function normalizeAdsConfig(raw) {
    const root = asRecord(raw);
    return {
        calculate: normalizePlacement(root.calculate, exports.DEFAULT_ADS_CONFIG.calculate),
        premium: normalizePlacement(root.premium, exports.DEFAULT_ADS_CONFIG.premium),
        dpi: normalizePlacement(root.dpi, exports.DEFAULT_ADS_CONFIG.dpi),
        quiz: normalizePlacement(root.quiz, exports.DEFAULT_ADS_CONFIG.quiz),
        secondChance: normalizePlacement(root.secondChance, exports.DEFAULT_ADS_CONFIG.secondChance),
        adBonus: normalizePlacement(root.adBonus, exports.DEFAULT_ADS_CONFIG.adBonus),
        checkIn: normalizePlacement(root.checkIn, exports.DEFAULT_ADS_CONFIG.checkIn),
        redeemDaily: normalizePlacement(root.redeemDaily, exports.DEFAULT_ADS_CONFIG.redeemDaily),
    };
}
function assertPlacement(placementCfg, code, label) {
    if (!placementCfg.incompleteMessage) {
        throw new app_error_1.AppError(code, `${label}: incomplete-ad message is required.`, 400);
    }
    if (!placementCfg.buttonLabel) {
        throw new app_error_1.AppError(code, `${label}: button label is required.`, 400);
    }
    (0, app_config_security_1.assertSafeText)(placementCfg.incompleteMessage, `${label} incomplete-ad message`);
    (0, app_config_security_1.assertSafeText)(placementCfg.buttonLabel, `${label} button label`);
}
function assertAdsConfigForSave(raw) {
    const normalized = normalizeAdsConfig(raw);
    assertPlacement(normalized.calculate, 'ADS_BAD_CALCULATE', 'Calculate');
    assertPlacement(normalized.premium, 'ADS_BAD_PREMIUM', 'Premium Pro');
    assertPlacement(normalized.dpi, 'ADS_BAD_DPI', 'DPI');
    assertPlacement(normalized.quiz, 'ADS_BAD_QUIZ', 'Quiz');
    assertPlacement(normalized.secondChance, 'ADS_BAD_SECOND_CHANCE', 'Second chance');
    assertPlacement(normalized.adBonus, 'ADS_BAD_AD_BONUS', 'Watch Ad Bonus');
    assertPlacement(normalized.checkIn, 'ADS_BAD_CHECK_IN', 'Check-in');
    assertPlacement(normalized.redeemDaily, 'ADS_BAD_REDEEM_DAILY', 'Redeem Daily');
    return normalized;
}
//# sourceMappingURL=app-config-ads.js.map