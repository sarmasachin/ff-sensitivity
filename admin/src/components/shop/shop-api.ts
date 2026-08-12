import { apiFetch } from "@/lib/api";
import type { ShopCategoryRow, ShopFormValues, ShopListRow } from "./shop-data";
import { formToApiBody } from "./shop-data";

export async function fetchShopBundle(): Promise<{
  items: ShopListRow[];
  categories: ShopCategoryRow[];
}> {
  const data = await apiFetch<{
    items: ShopListRow[];
    categories: ShopCategoryRow[];
  }>("/api/v1/admin/shop");
  return {
    items: data.items ?? [],
    categories: data.categories ?? [],
  };
}

export async function createShopItem(
  body: Record<string, unknown>,
): Promise<ShopListRow> {
  return apiFetch<ShopListRow>("/api/v1/admin/shop", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateShopItem(
  id: string,
  body: Record<string, unknown>,
): Promise<ShopListRow> {
  return apiFetch<ShopListRow>(
    `/api/v1/admin/shop/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function deleteShopItem(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(
    `/api/v1/admin/shop/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function createShopCategory(body: {
  id: string;
  label: string;
  isBoost?: boolean;
}): Promise<ShopCategoryRow> {
  return apiFetch<ShopCategoryRow>("/api/v1/admin/shop/categories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function shopFormBody(
  values: ShopFormValues,
  mode: "add" | "edit",
): Record<string, unknown> | { error: string } {
  return formToApiBody(values, mode);
}
