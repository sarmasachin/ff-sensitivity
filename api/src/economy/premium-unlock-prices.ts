import { Prisma } from '@prisma/client';
import { CONFIG_ID } from '../challenge/challenge-shared';

/**
 * Premium Sensi unlock products + defaults.
 * Live costs come from challenge_config (admin Economy); defaults if unset.
 */
export type PremiumUnlockProduct =
  | 'best_premium'
  | 'premium_pro_max'
  | 'one_tap_premium';

export const PREMIUM_UNLOCK_DEFAULT_COINS: Record<
  PremiumUnlockProduct,
  number
> = {
  best_premium: 100,
  premium_pro_max: 200,
  one_tap_premium: 150,
};

export const PREMIUM_UNLOCK_LABEL: Record<PremiumUnlockProduct, string> = {
  best_premium: 'Best Premium Sensi Unlock',
  premium_pro_max: 'Premium Sensi Pro Unlock',
  one_tap_premium: 'One Tap Premium Sensi Unlock',
};

/** @deprecated use PREMIUM_UNLOCK_DEFAULT_COINS — kept for older imports/tests */
export const PREMIUM_UNLOCK_COINS = PREMIUM_UNLOCK_DEFAULT_COINS;

export type PremiumUnlockPrices = Record<PremiumUnlockProduct, number>;

export type PremiumUnlockOptions = {
  coinUnlockEnabled: boolean;
  adUnlockEnabled: boolean;
};

export const PREMIUM_UNLOCK_DEFAULT_OPTIONS: PremiumUnlockOptions = {
  coinUnlockEnabled: true,
  adUnlockEnabled: true,
};

type PriceDb = {
  challengeConfig: {
    findUnique: Prisma.TransactionClient['challengeConfig']['findUnique'];
  };
};

export function isPremiumUnlockProduct(
  raw: string,
): raw is PremiumUnlockProduct {
  return Object.prototype.hasOwnProperty.call(
    PREMIUM_UNLOCK_DEFAULT_COINS,
    raw,
  );
}

export function clampPremiumUnlockCoins(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100_000, Math.floor(n)));
}

export async function loadPremiumUnlockPrices(
  db: PriceDb,
): Promise<PremiumUnlockPrices> {
  const row = await db.challengeConfig.findUnique({
    where: { id: CONFIG_ID },
    select: {
      premiumUnlockBestCoins: true,
      premiumUnlockProMaxCoins: true,
      premiumUnlockOneTapCoins: true,
    },
  });
  return {
    best_premium: clampPremiumUnlockCoins(
      row?.premiumUnlockBestCoins ?? PREMIUM_UNLOCK_DEFAULT_COINS.best_premium,
    ),
    premium_pro_max: clampPremiumUnlockCoins(
      row?.premiumUnlockProMaxCoins ??
        PREMIUM_UNLOCK_DEFAULT_COINS.premium_pro_max,
    ),
    one_tap_premium: clampPremiumUnlockCoins(
      row?.premiumUnlockOneTapCoins ??
        PREMIUM_UNLOCK_DEFAULT_COINS.one_tap_premium,
    ),
  };
}

export async function loadPremiumUnlockOptions(
  db: PriceDb,
): Promise<PremiumUnlockOptions> {
  const row = await db.challengeConfig.findUnique({
    where: { id: CONFIG_ID },
    select: {
      premiumUnlockCoinEnabled: true,
      premiumUnlockAdEnabled: true,
    },
  });
  return {
    coinUnlockEnabled:
      row?.premiumUnlockCoinEnabled ??
      PREMIUM_UNLOCK_DEFAULT_OPTIONS.coinUnlockEnabled,
    adUnlockEnabled:
      row?.premiumUnlockAdEnabled ??
      PREMIUM_UNLOCK_DEFAULT_OPTIONS.adUnlockEnabled,
  };
}

export function premiumUnlockCost(
  prices: PremiumUnlockPrices,
  product: PremiumUnlockProduct,
): number {
  return clampPremiumUnlockCoins(prices[product]);
}
