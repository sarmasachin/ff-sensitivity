/**
 * Full shop dynamic audit — lists what is live vs still static/hardcoded.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();
const ROOT = path.join(__dirname, '..', '..');

function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

type Row = { area: string; status: 'DYNAMIC' | 'STATIC' | 'PARTIAL'; detail: string };
const rows: Row[] = [];
function dyn(area: string, detail: string) {
  rows.push({ area, status: 'DYNAMIC', detail });
  console.log(`DYNAMIC  ${area} — ${detail}`);
}
function stat(area: string, detail: string) {
  rows.push({ area, status: 'STATIC', detail });
  console.log(`STATIC   ${area} — ${detail}`);
}
function part(area: string, detail: string) {
  rows.push({ area, status: 'PARTIAL', detail });
  console.log(`PARTIAL  ${area} — ${detail}`);
}

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function req(
  method: string,
  pathName: string,
  opts?: { token?: string; body?: unknown },
) {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 160) };
  }
  return { status: res.status, json };
}

async function main() {
  loadEnv();
  console.log('API', API);
  console.log('--- SHOP DYNAMIC AUDIT ---\n');

  const page = read('admin/src/app/(ops)/shop/page.tsx');
  const data = read('admin/src/components/shop/shop-data.ts');
  const api = read('admin/src/components/shop/shop-api.ts');
  const form = read('admin/src/components/shop/ShopFormModal.tsx');
  const toolbar = read('admin/src/components/shop/ShopToolbar.tsx');
  const econSvc = read('api/src/economy/economy.service.ts');
  const econCat = read('api/src/economy/economy-catalog.ts');
  const schema = read('api/prisma/schema.prisma');
  const seed = read('api/prisma/seed.ts');
  const androidTable = read(
    'app/src/main/java/com/ffsensitivity/app/data/ShopAdminTable.kt',
  );
  const androidCache = read(
    'app/src/main/java/com/ffsensitivity/app/data/ShopCatalogCache.kt',
  );
  const androidScreen = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/CoinShopScreen.kt',
  );
  const androidApi = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/EconomyApi.kt',
  );

  // Admin inventory
  if (
    page.includes('fetchShopBundle') &&
    page.includes('useState<ShopListRow[]>([])') &&
    !data.includes('SHOP_DEMO_ROWS')
  ) {
    dyn('admin_inventory_rows', 'Load/create/edit/delete via /api/v1/admin/shop');
  } else {
    stat('admin_inventory_rows', 'Still demo/local rows');
  }

  // Category options (dynamic defs)
  if (
    schema.includes('model ShopCategoryDef') &&
    api.includes('/admin/shop/categories') &&
    form.includes('Add category')
  ) {
    dyn(
      'admin_category_options',
      'Categories CRUD via ShopCategoryDef + form Add category',
    );
  } else {
    stat(
      'admin_category_options',
      'Categories still fixed / no create UI',
    );
  }

  // Toolbar filters
  if (toolbar.includes('categories.map')) {
    dyn('admin_toolbar_filters', 'Filter chips built from API categories prop');
  } else if (toolbar.includes('PRIZE') || toolbar.includes('Prizes')) {
    stat(
      'admin_toolbar_filters',
      'Category filter chips hardcoded to same 5 enums (+ live/disabled)',
    );
  }

  // Form defaults
  if (
    data.includes('defaultCategory = ""') &&
    data.includes('priceCoins: ""') &&
    data.includes('sortOrder: "0"')
  ) {
    dyn(
      'admin_form_defaults',
      'emptyShopForm uses first enabled API category + blank price',
    );
  } else if (data.includes('priceCoins: "100"') || data.includes('category: "BOOST"')) {
    stat(
      'admin_form_defaults',
      'emptyShopForm defaults (category=BOOST, price=100, oneTime=true) are hardcoded',
    );
  }

  // Capabilities copy
  try {
    read('admin/src/components/shop/ShopCapabilities.tsx');
    stat('admin_capabilities_copy', 'ShopCapabilities.tsx still present');
  } catch {
    dyn('admin_capabilities_copy', 'Static capabilities panel removed');
  }

  // Economy purchase catalog
  if (
    econSvc.includes('this.shop.findPurchaseItem') &&
    !econSvc.includes('SHOP_CATALOG[')
  ) {
    dyn('economy_purchase_catalog', 'Purchase resolves item from Postgres shop_items');
  } else {
    stat('economy_purchase_catalog', 'Still hardcoded SHOP_CATALOG');
  }

  if (econCat.includes('export const SHOP_CATALOG')) {
    part(
      'economy_catalog_ts_leftover',
      'SHOP_CATALOG still exists in economy-catalog.ts (seed/reference leftover, not used for purchase)',
    );
  } else {
    dyn('economy_catalog_ts_leftover', 'SHOP_CATALOG removed from economy-catalog.ts');
  }

  // App catalog API
  if (androidApi.includes('/api/v1/economy/shop/catalog')) {
    dyn('android_catalog_api', 'Fetches /api/v1/economy/shop/catalog');
  } else {
    stat('android_catalog_api', 'No remote catalog call');
  }

  if (
    androidCache.includes('No hardcoded offline seed') ||
    (androidCache.includes('applyRemote') &&
      !androidCache.includes('ShopAdminTable'))
  ) {
    dyn('android_offline_fallback', 'Remote-only cache; no hardcoded offline seed');
  } else if (
    androidCache.includes('ShopAdminTable.items()') &&
    androidScreen.includes('ShopCatalogCache.items()')
  ) {
    part(
      'android_offline_fallback',
      'If API fails/empty, still falls back to hardcoded ShopAdminTable.kt rows',
    );
  }

  if (androidTable.includes('fun items(): List<ShopItem> = emptyList()')) {
    dyn('android_ShopAdminTable', 'ShopAdminTable empty stub only');
  } else if (androidTable.includes('private val table: List<ShopItem> = listOf(')) {
    stat(
      'android_ShopAdminTable',
      'Hardcoded offline catalog still in app (fallback + rebuild source of truth for offline)',
    );
  }

  // Seed
  if (seed.includes('shopItem.count()') && seed.includes('skip item seed')) {
    part(
      'db_seed_catalog',
      'Seed inserts default items only when shop_items is empty',
    );
  } else if (seed.includes('shopSeed') || seed.includes('Shop catalog seed')) {
    part(
      'db_seed_catalog',
      'Initial items upserted by seed — dynamic after that, but first populate is hardcoded in seed.ts',
    );
  }

  // Reward tags / sort order UI
  if (form.includes('sortOrder') || page.includes('sortOrder')) {
    dyn('admin_sortOrder_ui', 'Add/Edit form exposes sortOrder');
  } else {
    part(
      'admin_sortOrder_ui',
      'sortOrder exists in DB/API but Add/Edit form has no sortOrder field — always default/seed order',
    );
  }

  // Live proof
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_USER_SECRET) {
    console.log('\nFAIL missing jwt secrets');
    process.exit(1);
  }
  const admin = await prisma.admin.findFirst({
    where: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      isActive: true,
    },
  });
  if (!admin) {
    console.log('\nFAIL no admin');
    process.exit(1);
  }
  const adminTok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );

  const list = await req('GET', '/api/v1/admin/shop', { token: adminTok });
  const dbCount = await prisma.shopItem.count();
  const apiCount = (list.json?.items ?? []).length;
  if (list.status === 200 && apiCount === dbCount) {
    dyn('live_list_equals_db', `${apiCount}==${dbCount}`);
  } else {
    stat('live_list_equals_db', `status=${list.status} api=${apiCount} db=${dbCount}`);
  }

  // Prove category is CRUD-able via admin API
  const stamp = Date.now();
  const catId = `SPECIAL_${stamp}`.slice(0, 32);
  const catCreate = await req('POST', '/api/v1/admin/shop/categories', {
    token: adminTok,
    body: {
      id: catId,
      label: 'Special Audit',
      sortOrder: 99,
      enabled: true,
      isBoost: false,
    },
  });
  if (catCreate.status === 200 || catCreate.status === 201) {
    dyn('category_create_api', `Created category ${catId}`);
    const itemId = `audit_dyn_${stamp}`;
    const createdOnCat = await req('POST', '/api/v1/admin/shop', {
      token: adminTok,
      body: {
        id: itemId,
        title: 'Audit Dynamic Cat',
        subtitle: 'temp',
        category: catId,
        priceCoins: 11,
        enabled: true,
        oneTime: true,
        rewardTag: 'AUD',
      },
    });
    if (createdOnCat.status === 200 || createdOnCat.status === 201) {
      dyn('item_on_new_category', `item ${itemId} on ${catId}`);
      await req('DELETE', `/api/v1/admin/shop/${itemId}`, { token: adminTok });
    } else {
      stat('item_on_new_category', JSON.stringify(createdOnCat.json));
    }
    await req('DELETE', `/api/v1/admin/shop/categories/${catId}`, {
      token: adminTok,
    });
  } else {
    stat(
      'category_create_api',
      `status=${catCreate.status} ${JSON.stringify(catCreate.json)}`,
    );
  }

  // Valid item still works (create+delete) on seeded PACK
  const id = `audit_dyn_pack_${stamp}`;
  const created = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id,
      title: 'Audit Dynamic',
      subtitle: 'temp',
      category: 'PACK',
      priceCoins: 11,
      enabled: true,
      oneTime: true,
      rewardTag: 'AUD',
    },
  });
  if (created.status === 200 || created.status === 201) {
    dyn('item_crud_live', `create ok id=${id}`);
    await req('DELETE', `/api/v1/admin/shop/${id}`, { token: adminTok });
  } else {
    stat('item_crud_live', JSON.stringify(created.json));
  }

  // App catalog uses DB
  const user = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (user) {
    const userTok = jwt.sign(
      { sub: user.id, email: user.email, aud: 'user', tv: 0 },
      process.env.JWT_USER_SECRET!,
      { expiresIn: '15m' },
    );
    const cat = await req('GET', '/api/v1/economy/shop/catalog', {
      token: userTok,
    });
    const enabledDb = await prisma.shopItem.count({
      where: { enabled: true, priceCoins: { gt: 0 } },
    });
    const catCount = (cat.json?.items ?? []).length;
    if (cat.status === 200 && catCount === enabledDb) {
      dyn('app_catalog_equals_enabled_db', `${catCount}==${enabledDb}`);
    } else {
      part(
        'app_catalog_equals_enabled_db',
        `status=${cat.status} cat=${catCount} enabledDb=${enabledDb}`,
      );
    }
  }

  const summary = {
    DYNAMIC: rows.filter((r) => r.status === 'DYNAMIC').length,
    STATIC: rows.filter((r) => r.status === 'STATIC').length,
    PARTIAL: rows.filter((r) => r.status === 'PARTIAL').length,
  };
  console.log('\n--- STILL NOT FULLY DYNAMIC ---');
  for (const r of rows.filter((r) => r.status !== 'DYNAMIC')) {
    console.log(`- [${r.status}] ${r.area}: ${r.detail}`);
  }
  console.log(
    `\nSUMMARY dynamic=${summary.DYNAMIC} static=${summary.STATIC} partial=${summary.PARTIAL}`,
  );

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
