// --- Start: Economy live wire (Sachin) ---
/** Fixed earn amounts — server decides, client cannot pick amount. */
export const ECONOMY_AMOUNTS = {
  checkin: 20,
  checkinBoostExtra: 20,
  quizCorrect: 50,
  quizWrong: -10,
  adBonus: 30,
} as const;

export const BOOST_CHECKIN = 'boost_checkin_plus';
export const BOOST_QUIZ = 'boost_quiz_double';

export const MILESTONE_REWARDS: Record<number, number> = {
  7: 50,
  15: 75,
  20: 100,
  30: 150,
  45: 200,
  60: 250,
  75: 300,
  90: 400,
  100: 500,
  120: 600,
  150: 750,
  180: 1000,
  200: 1200,
  240: 1500,
  260: 1700,
  290: 2000,
  300: 2200,
  350: 2500,
  360: 2800,
  365: 5000,
};

export type ShopCatalogItem = {
  id: string;
  priceCoins: number;
  oneTime: boolean;
  stockLimit: number | null;
  enabled: boolean;
  isBoost: boolean;
};

/** Mirrors Android ShopAdminTable enabled paid items. */
export const SHOP_CATALOG: Record<string, ShopCatalogItem> = {
  prize_google_play_gift: {
    id: 'prize_google_play_gift',
    priceCoins: 500,
    oneTime: false,
    stockLimit: 20,
    enabled: true,
    isBoost: false,
  },
  prize_ff_diamonds: {
    id: 'prize_ff_diamonds',
    priceCoins: 400,
    oneTime: false,
    stockLimit: 40,
    enabled: true,
    isBoost: false,
  },
  prize_ffmax_diamonds: {
    id: 'prize_ffmax_diamonds',
    priceCoins: 450,
    oneTime: false,
    stockLimit: 40,
    enabled: true,
    isBoost: false,
  },
  prize_royale_pass: {
    id: 'prize_royale_pass',
    priceCoins: 600,
    oneTime: true,
    stockLimit: null,
    enabled: true,
    isBoost: false,
  },
  prize_premium_skin: {
    id: 'prize_premium_skin',
    priceCoins: 350,
    oneTime: false,
    stockLimit: 30,
    enabled: true,
    isBoost: false,
  },
  boost_quiz_double: {
    id: 'boost_quiz_double',
    priceCoins: 80,
    oneTime: false,
    stockLimit: 30,
    enabled: true,
    isBoost: true,
  },
  boost_checkin_plus: {
    id: 'boost_checkin_plus',
    priceCoins: 60,
    oneTime: false,
    stockLimit: 30,
    enabled: true,
    isBoost: true,
  },
  pack_scratch_bonus: {
    id: 'pack_scratch_bonus',
    priceCoins: 120,
    oneTime: false,
    stockLimit: 50,
    enabled: true,
    isBoost: false,
  },
  cosmetic_gold_wallet: {
    id: 'cosmetic_gold_wallet',
    priceCoins: 100,
    oneTime: true,
    stockLimit: null,
    enabled: true,
    isBoost: false,
  },
  cosmetic_foil_obsidian: {
    id: 'cosmetic_foil_obsidian',
    priceCoins: 180,
    oneTime: true,
    stockLimit: null,
    enabled: true,
    isBoost: false,
  },
};

export function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
// --- End: Economy live wire (Sachin) ---
