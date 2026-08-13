/**
 * Shop live-wire cross-check: admin CRUD ↔ DB ↔ app catalog ↔ purchase,
 * validation, viewer forbid, disable gate, source wiring. No leftovers.
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

type Check = { name: string; ok: boolean };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
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
    json = { raw: text.slice(0, 180) };
  }
  return { status: res.status, json };
}

async function main() {
  loadEnv();
  console.log('API', API);

  // --- Source wiring (miss checks) ---
  const page = read('admin/src/app/(ops)/shop/page.tsx');
  const data = read('admin/src/components/shop/shop-data.ts');
  const api = read('admin/src/components/shop/shop-api.ts');
  const form = read('admin/src/components/shop/ShopFormModal.tsx');
  const econSvc = read('api/src/economy/economy.service.ts');
  const econCtl = read('api/src/economy/economy.controller.ts');
  const androidApi = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/EconomyApi.kt',
  );
  const androidRepo = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/EconomyRepository.kt',
  );
  const androidScreen = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/CoinShopScreen.kt',
  );
  const cache = read(
    'app/src/main/java/com/ffsensitivity/app/data/ShopCatalogCache.kt',
  );

  !page.includes('SHOP_DEMO_ROWS') &&
  !data.includes('SHOP_DEMO_ROWS') &&
  !data.includes('SHOP_API_UNAVAILABLE') &&
  page.includes('fetchShopBundle') &&
  page.includes('createShopItem')
    ? pass('admin_ui_live_not_demo')
    : fail('admin_ui_live_not_demo');

  api.includes('/api/v1/admin/shop') &&
  form.includes('await onSubmit') &&
  form.includes('submitting')
    ? pass('admin_api_client_and_async_form')
    : fail('admin_api_client_and_async_form');

  !econSvc.includes('SHOP_CATALOG[') &&
  econSvc.includes('this.shop.findPurchaseItem') &&
  econCtl.includes("Get('shop/catalog')")
    ? pass('economy_reads_db_catalog')
    : fail('economy_reads_db_catalog');

  androidApi.includes('/api/v1/economy/shop/catalog') &&
  androidRepo.includes('ShopCatalogCache.applyRemote') &&
  androidScreen.includes('ShopCatalogCache.items()') &&
  !androidScreen.includes('ShopAdminTable.items()') &&
  cache.includes('No hardcoded offline seed')
    ? pass('android_catalog_remote_only')
    : fail('android_catalog_remote_only');

  const seed = read('api/prisma/seed.ts');
  !seed.includes('shopItem.createMany') &&
  !seed.includes('const shopSeed') &&
  seed.includes('Dummy shop items removed')
    ? pass('seed_does_not_insert_shop_items')
    : fail('seed_does_not_insert_shop_items');

  const leftoverDummy = await prisma.shopItem.count({
    where: {
      id: {
        in: [
          'prize_google_play_gift',
          'prize_ff_diamonds',
          'prize_ffmax_diamonds',
          'prize_royale_pass',
          'prize_premium_skin',
          'boost_quiz_double',
          'boost_checkin_plus',
          'unlock_premium_badge',
          'unlock_elite_title',
          'pack_stylish_rare',
          'pack_scratch_bonus',
          'cosmetic_gold_wallet',
          'cosmetic_foil_obsidian',
        ],
      },
    },
  });
  leftoverDummy === 0
    ? pass('db_has_no_dummy_shop_items')
    : fail('db_has_no_dummy_shop_items', String(leftoverDummy));

  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_USER_SECRET) {
    fail('jwt_secrets');
    process.exit(1);
  }

  const admin = await prisma.admin.findFirst({
    where: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      isActive: true,
    },
  });
  if (!admin) {
    fail('superadmin');
    process.exit(1);
  }
  const adminTok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '20m' },
  );

  // Viewer cannot mutate
  const viewer = await prisma.admin.create({
    data: {
      email: `e2e.shop.viewer.${Date.now()}@example.com`,
      passwordHash: admin.passwordHash,
      role: 'VIEWER',
      allowedModules: ['shop'],
      isActive: true,
    },
  });
  const viewerTok = jwt.sign(
    { sub: viewer.id, email: viewer.email, role: viewer.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '20m' },
  );
  const viewerList = await req('GET', '/api/v1/admin/shop', {
    token: viewerTok,
  });
  viewerList.status === 200
    ? pass('viewer_can_list')
    : fail('viewer_can_list', JSON.stringify(viewerList.json));
  const viewerCreate = await req('POST', '/api/v1/admin/shop', {
    token: viewerTok,
    body: {
      id: `viewer_block_${Date.now()}`,
      title: 'Nope',
      subtitle: 'Nope',
      category: 'PACK',
      priceCoins: 10,
      enabled: true,
      oneTime: true,
      rewardTag: 'NO',
    },
  });
  viewerCreate.status === 403
    ? pass('viewer_cannot_create', viewerCreate.json?.error?.message)
    : fail('viewer_cannot_create', JSON.stringify(viewerCreate.json));

  // Validation
  const badId = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id: 'BAD ID',
      title: 'x',
      subtitle: 'y',
      category: 'BOOST',
      priceCoins: 10,
      enabled: true,
      oneTime: true,
      rewardTag: 'T',
    },
  });
  badId.status === 400
    ? pass('reject_bad_id')
    : fail('reject_bad_id', JSON.stringify(badId.json));

  const badPrice = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id: `bad_price_${Date.now()}`,
      title: 'x',
      subtitle: 'y',
      category: 'BOOST',
      priceCoins: 0,
      enabled: true,
      oneTime: true,
      rewardTag: 'T',
    },
  });
  badPrice.status === 400
    ? pass('reject_zero_price')
    : fail('reject_zero_price', JSON.stringify(badPrice.json));

  const stamp = Date.now().toString();
  const id = `xcheck_shop_${stamp}`;
  const created = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id,
      title: 'Crosscheck Boost',
      subtitle: 'E2E crosscheck item',
      category: 'BOOST',
      priceCoins: 55,
      enabled: true,
      oneTime: false,
      stockLimit: 2,
      rewardTag: 'XCHECK',
      sortOrder: 900,
    },
  });
  (created.status === 200 || created.status === 201) && created.json?.id === id
    ? pass('create_ok')
    : fail('create_ok', JSON.stringify(created.json));

  const dbRow = await prisma.shopItem.findUnique({ where: { id } });
  dbRow?.priceCoins === 55 && dbRow.title === 'Crosscheck Boost'
    ? pass('db_persisted_create')
    : fail('db_persisted_create', JSON.stringify(dbRow));

  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-shop-xcheck-${stamp}`,
      email: `e2e-shop-xcheck-${stamp}@ffsensitivity.local`,
      displayName: 'Shop XCheck',
      coins: 200,
    },
  });
  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET,
    { expiresIn: '1h' },
  );

  const cat = await req('GET', '/api/v1/economy/shop/catalog', {
    token: userTok,
  });
  const hit = (cat.json?.items ?? []).find((r: any) => r.id === id);
  cat.status === 200 && hit?.priceCoins === 55 && hit?.rewardTag === 'XCHECK'
    ? pass('app_catalog_sees_new_item')
    : fail('app_catalog_sees_new_item', JSON.stringify(hit ?? cat.json));

  const buy1 = await req('POST', '/api/v1/economy/shop/purchase', {
    token: userTok,
    body: { itemId: id, requestId: randomUUID() },
  });
  (buy1.status === 200 || buy1.status === 201) && buy1.json?.coins === 145
    ? pass('purchase_against_db_item', `coins=${buy1.json?.coins}`)
    : fail('purchase_against_db_item', JSON.stringify(buy1.json));

  const boost = await prisma.userBoostCharge.findUnique({
    where: { userId_boostId: { userId: user.id, boostId: id } },
  });
  (boost?.charges ?? 0) >= 1
    ? pass('boost_charge_granted_for_boost_category')
    : fail('boost_charge_granted_for_boost_category', JSON.stringify(boost));

  // Disable → disappears from catalog + purchase blocked
  const disabled = await req('PATCH', `/api/v1/admin/shop/${id}`, {
    token: adminTok,
    body: { enabled: false },
  });
  disabled.status === 200 && disabled.json?.enabled === false
    ? pass('admin_disable')
    : fail('admin_disable', JSON.stringify(disabled.json));

  const cat2 = await req('GET', '/api/v1/economy/shop/catalog', {
    token: userTok,
  });
  const still = (cat2.json?.items ?? []).find((r: any) => r.id === id);
  !still
    ? pass('disabled_hidden_from_app_catalog')
    : fail('disabled_hidden_from_app_catalog');

  const buyDisabled = await req('POST', '/api/v1/economy/shop/purchase', {
    token: userTok,
    body: { itemId: id, requestId: randomUUID() },
  });
  buyDisabled.status === 404 &&
  buyDisabled.json?.error?.code === 'SHOP_ITEM_NOT_FOUND'
    ? pass('purchase_blocked_when_disabled')
    : fail('purchase_blocked_when_disabled', JSON.stringify(buyDisabled.json));

  // Known dummy catalog ids must not be purchasable anymore
  await prisma.user.update({ where: { id: user.id }, data: { coins: 100 } });
  const classic = await req('POST', '/api/v1/economy/shop/purchase', {
    token: userTok,
    body: { itemId: 'cosmetic_gold_wallet', requestId: randomUUID() },
  });
  classic.status === 404 &&
  classic.json?.error?.code === 'SHOP_ITEM_NOT_FOUND'
    ? pass('dummy_shop_item_not_purchasable')
    : fail('dummy_shop_item_not_purchasable', JSON.stringify(classic.json));

  // Audit rows
  const audits = await prisma.auditLog.count({
    where: { entity: `shop:${id}` },
  });
  audits >= 2
    ? pass('audit_rows_written', String(audits))
    : fail('audit_rows_written', String(audits));

  await req('DELETE', `/api/v1/admin/shop/${id}`, { token: adminTok });
  const gone = await prisma.shopItem.findUnique({ where: { id } });
  !gone ? pass('delete_removes_db_row') : fail('delete_removes_db_row');

  await prisma.admin.delete({ where: { id: viewer.id } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await prisma.shopItem.deleteMany({ where: { id: { startsWith: 'xcheck_shop_' } } });

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
