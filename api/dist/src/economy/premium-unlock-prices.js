"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREMIUM_UNLOCK_DEFAULT_OPTIONS = exports.PREMIUM_UNLOCK_COINS = exports.PREMIUM_UNLOCK_LABEL = exports.PREMIUM_UNLOCK_DEFAULT_COINS = void 0;
exports.isPremiumUnlockProduct = isPremiumUnlockProduct;
exports.clampPremiumUnlockCoins = clampPremiumUnlockCoins;
exports.loadPremiumUnlockPrices = loadPremiumUnlockPrices;
exports.loadPremiumUnlockOptions = loadPremiumUnlockOptions;
exports.premiumUnlockCost = premiumUnlockCost;
const challenge_shared_1 = require("../challenge/challenge-shared");
exports.PREMIUM_UNLOCK_DEFAULT_COINS = {
    best_premium: 100,
    premium_pro_max: 200,
    one_tap_premium: 150,
};
exports.PREMIUM_UNLOCK_LABEL = {
    best_premium: 'Best Premium Sensi Unlock',
    premium_pro_max: 'Premium Sensi Pro Unlock',
    one_tap_premium: 'One Tap Premium Sensi Unlock',
};
exports.PREMIUM_UNLOCK_COINS = exports.PREMIUM_UNLOCK_DEFAULT_COINS;
exports.PREMIUM_UNLOCK_DEFAULT_OPTIONS = {
    coinUnlockEnabled: true,
    adUnlockEnabled: true,
};
function isPremiumUnlockProduct(raw) {
    return Object.prototype.hasOwnProperty.call(exports.PREMIUM_UNLOCK_DEFAULT_COINS, raw);
}
function clampPremiumUnlockCoins(n) {
    if (!Number.isFinite(n))
        return 0;
    return Math.max(0, Math.min(100_000, Math.floor(n)));
}
async function loadPremiumUnlockPrices(db) {
    const row = await db.challengeConfig.findUnique({
        where: { id: challenge_shared_1.CONFIG_ID },
        select: {
            premiumUnlockBestCoins: true,
            premiumUnlockProMaxCoins: true,
            premiumUnlockOneTapCoins: true,
        },
    });
    return {
        best_premium: clampPremiumUnlockCoins(row?.premiumUnlockBestCoins ?? exports.PREMIUM_UNLOCK_DEFAULT_COINS.best_premium),
        premium_pro_max: clampPremiumUnlockCoins(row?.premiumUnlockProMaxCoins ??
            exports.PREMIUM_UNLOCK_DEFAULT_COINS.premium_pro_max),
        one_tap_premium: clampPremiumUnlockCoins(row?.premiumUnlockOneTapCoins ??
            exports.PREMIUM_UNLOCK_DEFAULT_COINS.one_tap_premium),
    };
}
async function loadPremiumUnlockOptions(db) {
    const row = await db.challengeConfig.findUnique({
        where: { id: challenge_shared_1.CONFIG_ID },
        select: {
            premiumUnlockCoinEnabled: true,
            premiumUnlockAdEnabled: true,
        },
    });
    return {
        coinUnlockEnabled: row?.premiumUnlockCoinEnabled ??
            exports.PREMIUM_UNLOCK_DEFAULT_OPTIONS.coinUnlockEnabled,
        adUnlockEnabled: row?.premiumUnlockAdEnabled ??
            exports.PREMIUM_UNLOCK_DEFAULT_OPTIONS.adUnlockEnabled,
    };
}
function premiumUnlockCost(prices, product) {
    return clampPremiumUnlockCoins(prices[product]);
}
//# sourceMappingURL=premium-unlock-prices.js.map