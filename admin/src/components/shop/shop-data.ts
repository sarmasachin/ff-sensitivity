export type ShopCategoryRow = {
  id: string;
  label: string;
  sortOrder: number;
  enabled: boolean;
  isBoost: boolean;
};

export type ShopListRow = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  categoryLabel?: string;
  priceCoins: number;
  enabled: boolean;
  oneTime: boolean;
  stockLimit: number | null;
  rewardTag: string;
  sortOrder: number;
};

export type ShopFormValues = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  priceCoins: string;
  enabled: boolean;
  oneTime: boolean;
  stockLimit: string;
  rewardTag: string;
  sortOrder: string;
};

export function emptyShopForm(defaultCategory = ""): ShopFormValues {
  return {
    id: "",
    title: "",
    subtitle: "",
    category: defaultCategory,
    priceCoins: "",
    enabled: true,
    oneTime: false,
    stockLimit: "",
    rewardTag: "",
    sortOrder: "0",
  };
}

/** Build shop item id from title — lowercase a-z0-9_, max 64. */
export function titleToShopItemId(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64)
    .replace(/_+$/g, "");
  return slug;
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
    sortOrder: String(row.sortOrder ?? 0),
  };
}

export function formToApiBody(
  values: ShopFormValues,
  mode: "add" | "edit",
): Record<string, unknown> | { error: string } {
  const title = values.title.trim();
  const subtitle = values.subtitle.trim();
  const rewardTag = values.rewardTag.trim().toUpperCase();
  const category = values.category.trim().toUpperCase();
  const idRaw =
    mode === "add" ? titleToShopItemId(title) : values.id.trim().toLowerCase();

  if (!title) return { error: "Title is required." };
  if (!subtitle) return { error: "Subtitle is required." };
  if (!rewardTag) return { error: "Reward tag is required." };
  if (!category) return { error: "Category is required." };
  if (mode === "add") {
    if (idRaw.length < 2) {
      return {
        error:
          "Title must include at least 2 letters or numbers so an ID can be created.",
      };
    }
    if (!/^[a-z0-9_]+$/.test(idRaw)) {
      return {
        error: "ID must use lowercase letters, numbers, and underscores.",
      };
    }
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

  const sortOrder = Number(values.sortOrder.trim() || "0");
  if (!Number.isFinite(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    return { error: "Sort order must be 0–9999." };
  }

  const body: Record<string, unknown> = {
    title,
    subtitle,
    category,
    priceCoins: Math.floor(priceCoins),
    enabled: values.enabled,
    oneTime: values.oneTime,
    stockLimit: stockLimit == null ? null : Math.floor(stockLimit),
    rewardTag,
    sortOrder: Math.floor(sortOrder),
  };
  if (mode === "add") body.id = idRaw;
  return body;
}

export function computeShopStats(rows: ShopListRow[]) {
  return {
    live: rows.filter((r) => r.enabled && r.priceCoins > 0).length,
    disabled: rows.filter((r) => !r.enabled).length,
    oneTime: rows.filter((r) => r.oneTime).length,
    limited: rows.filter((r) => r.stockLimit != null).length,
  };
}
