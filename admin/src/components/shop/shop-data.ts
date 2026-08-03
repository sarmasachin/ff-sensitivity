export type ShopCategory =
  | "PRIZE"
  | "BOOST"
  | "UNLOCK"
  | "PACK"
  | "COSMETIC";

export type ShopListRow = {
  id: string;
  title: string;
  subtitle: string;
  category: ShopCategory;
  priceCoins: number;
  enabled: boolean;
  oneTime: boolean;
  stockLimit: number | null;
  rewardTag: string;
};

export type ShopFormValues = {
  id: string;
  title: string;
  subtitle: string;
  category: ShopCategory;
  priceCoins: string;
  enabled: boolean;
  oneTime: boolean;
  stockLimit: string;
  rewardTag: string;
};

export const SHOP_CATEGORY_LABEL: Record<ShopCategory, string> = {
  PRIZE: "Prizes",
  BOOST: "Boosts",
  UNLOCK: "Unlocks",
  PACK: "Packs",
  COSMETIC: "Cosmetics",
};

export function emptyShopForm(): ShopFormValues {
  return {
    id: "",
    title: "",
    subtitle: "",
    category: "BOOST",
    priceCoins: "100",
    enabled: true,
    oneTime: true,
    stockLimit: "",
    rewardTag: "",
  };
}

export function rowToForm(row: ShopListRow): ShopFormValues {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    priceCoins: String(row.priceCoins),
    enabled: row.enabled,
    oneTime: row.oneTime,
    stockLimit: row.stockLimit == null ? "" : String(row.stockLimit),
    rewardTag: row.rewardTag,
  };
}

export function formToRow(
  values: ShopFormValues,
  fallbackId: string,
): ShopListRow | { error: string } {
  const title = values.title.trim();
  const subtitle = values.subtitle.trim();
  const rewardTag = values.rewardTag.trim().toUpperCase();
  const idRaw = values.id.trim().toLowerCase().replace(/\s+/g, "_");
  const id = idRaw || fallbackId;

  if (!title) return { error: "Title is required." };
  if (!subtitle) return { error: "Subtitle is required." };
  if (!rewardTag) return { error: "Reward tag is required." };
  if (!/^[a-z0-9_]+$/.test(id)) {
    return { error: "ID must use lowercase letters, numbers, and underscores." };
  }

  const priceCoins = Number(values.priceCoins);
  if (!Number.isFinite(priceCoins) || priceCoins <= 0) {
    return { error: "Price must be a number greater than 0." };
  }

  const stockRaw = values.stockLimit.trim();
  const stockLimit = stockRaw === "" ? null : Number(stockRaw);
  if (stockLimit != null && (!Number.isFinite(stockLimit) || stockLimit < 0)) {
    return { error: "Stock limit must be empty (unlimited) or ≥ 0." };
  }

  return {
    id,
    title,
    subtitle,
    category: values.category,
    priceCoins: Math.floor(priceCoins),
    enabled: values.enabled,
    oneTime: values.oneTime,
    stockLimit: stockLimit == null ? null : Math.floor(stockLimit),
    rewardTag,
  };
}

export function computeShopStats(rows: ShopListRow[]) {
  const live = rows.filter((r) => r.enabled && r.priceCoins > 0).length;
  const disabled = rows.filter((r) => !r.enabled).length;
  const oneTime = rows.filter((r) => r.oneTime).length;
  const limited = rows.filter((r) => r.stockLimit != null).length;
  return { live, disabled, oneTime, limited };
}

/** Demo catalog — mirrors Android ShopAdminTable (local until Nest API). */
export const SHOP_DEMO_ROWS: ShopListRow[] = [
  {
    id: "prize_google_play_gift",
    title: "Google Play Gift Card",
    subtitle: "In-app vault entry only · not a real Google Play code yet.",
    category: "PRIZE",
    priceCoins: 500,
    enabled: true,
    oneTime: false,
    stockLimit: 20,
    rewardTag: "VAULT",
  },
  {
    id: "prize_ff_diamonds",
    title: "Free Fire Diamonds",
    subtitle: "In-app vault entry only · diamonds are not delivered in-game yet.",
    category: "PRIZE",
    priceCoins: 400,
    enabled: true,
    oneTime: false,
    stockLimit: 40,
    rewardTag: "VAULT",
  },
  {
    id: "boost_quiz_double",
    title: "Quiz Double Coins",
    subtitle: "Next correct daily quiz pays 2× coins.",
    category: "BOOST",
    priceCoins: 80,
    enabled: true,
    oneTime: false,
    stockLimit: 30,
    rewardTag: "2× QUIZ",
  },
  {
    id: "boost_checkin_plus",
    title: "Check-in Plus",
    subtitle: "Next daily check-in pays +20 extra coins.",
    category: "BOOST",
    priceCoins: 60,
    enabled: true,
    oneTime: false,
    stockLimit: 30,
    rewardTag: "STREAK+",
  },
  {
    id: "unlock_premium_badge",
    title: "Pro Player Badge",
    subtitle: "Unlock a Pro Player badge for your profile & archive.",
    category: "UNLOCK",
    priceCoins: 200,
    enabled: false,
    oneTime: true,
    stockLimit: null,
    rewardTag: "BADGE",
  },
  {
    id: "pack_scratch_bonus",
    title: "Bonus Scratch Token",
    subtitle: "Adds a shop win token to your scratch archive history.",
    category: "PACK",
    priceCoins: 120,
    enabled: true,
    oneTime: false,
    stockLimit: 50,
    rewardTag: "TOKEN",
  },
  {
    id: "cosmetic_gold_wallet",
    title: "Gold Wallet Chip",
    subtitle: "Premium gold accent on your in-app coin wallet chip.",
    category: "COSMETIC",
    priceCoins: 100,
    enabled: true,
    oneTime: true,
    stockLimit: null,
    rewardTag: "STYLE",
  },
  {
    id: "cosmetic_foil_obsidian",
    title: "Obsidian Foil Skin",
    subtitle: "Dark premium foil look on scratch cards.",
    category: "COSMETIC",
    priceCoins: 180,
    enabled: true,
    oneTime: true,
    stockLimit: null,
    rewardTag: "FOIL",
  },
];

export const SHOP_CAPABILITIES = [
  {
    title: "Catalog CRUD",
    body: "Add / edit / disable items — title, subtitle, category, price, stock, reward tag.",
  },
  {
    title: "Category filters",
    body: "Prizes, Boosts, Unlocks, Packs, Cosmetics — matches Android Coin Shop tabs.",
  },
  {
    title: "Live enable toggle",
    body: "Hide from the app without deleting the row (enabled flag).",
  },
  {
    title: "One-time & stock",
    body: "Per-user one-time buys and optional global stock limits.",
  },
  {
    title: "Remote sync",
    body: "Nest API will replace the local Android ShopAdminTable seed.",
  },
  {
    title: "Purchase log",
    body: "Who bought what, coin debit, device id — wire after economy API.",
  },
];
