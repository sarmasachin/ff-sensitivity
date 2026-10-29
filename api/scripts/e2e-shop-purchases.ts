/**
 * Shop admin purchases: who bought or unlocked what (local Postgres).
 * Buys go through the app purchase API. The admin list must match every
 * shop ledger row, with the full user email.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();

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

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}
function okAuth(status: number) {
  return status === 200 || status === 201;
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
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, json, headers: res.headers };
}

function bearer(res: { json: any; headers: Headers }): string | undefined {
  if (typeof res.json?.accessToken === 'string') return res.json.accessToken;
  const list =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [];
  for (const cookie of list) {
    const m = /^access_token=([^;]+)/.exec(cookie);
    if (m) return decodeURIComponent(m[1]);
  }
  return undefined;
}

function userJwt(userId: string, email: string, tv: number) {
  return jwt.sign(
    { sub: userId, email, aud: 'user', tv },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
}

type Purchase = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  deviceId: string;
  deviceLabel: string;
  itemId: string;
  itemTitle: string;
  category: string;
  oneTime: boolean;
  coins: number;
  balanceAfter: number;
  createdAt: string;
};

async function main() {
  loadEnv();
  const stamp = Date.now().toString(36);
  const catId = `E2E${stamp.toUpperCase()}`.slice(0, 32);
  const unlockId = `e2eunl${stamp}`;
  const repeatId = `e2erep${stamp}`;
  const doomedId = `e2edel${stamp}`;
  const offId = `e2eoff${stamp}`;
  const buyerEmail = `e2e.shop.buyer.${stamp}@example.com`;
  const blankEmail = `e2e.shop.blank.${stamp}@example.com`;
  const poorEmail = `e2e.shop.poor.${stamp}@example.com`;
  const userIds: string[] = [];
  const itemIds = [unlockId, repeatId, doomedId, offId];

  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';

  try {
    {
      const r = await req('GET', '/api/v1/admin/shop/purchases');
      r.status === 401
        ? pass('purchases_auth_required')
        : fail('purchases_auth_required', `status=${r.status}`);
    }

    const login = await req('POST', '/api/v1/auth/login', {
      body: { email: adminEmail, password: adminPassword },
    });
    const tok = bearer(login);
    if (!okAuth(login.status) || !tok) {
      fail('admin_login', `status=${login.status}`);
      return;
    }
    pass('admin_login');

    const cat = await req('POST', '/api/v1/admin/shop/categories', {
      token: tok,
      body: { id: catId, label: 'E2E Shop', enabled: true, isBoost: false },
    });
    okAuth(cat.status)
      ? pass('category_create')
      : fail('category_create', `status=${cat.status} ${JSON.stringify(cat.json)}`);

    async function addItem(body: Record<string, unknown>, name: string) {
      const r = await req('POST', '/api/v1/admin/shop', { token: tok, body });
      okAuth(r.status)
        ? pass(name)
        : fail(name, `status=${r.status} ${JSON.stringify(r.json)}`);
    }

    await addItem(
      {
        id: unlockId,
        title: 'E2E Unlock Skin',
        subtitle: 'Buy once',
        category: catId,
        priceCoins: 10,
        enabled: true,
        oneTime: true,
        rewardTag: 'SKIN',
        sortOrder: 1,
      },
      'item_unlock_create',
    );
    await addItem(
      {
        id: repeatId,
        title: 'E2E Coin Pack',
        subtitle: 'Repeat buy',
        category: catId,
        priceCoins: 7,
        enabled: true,
        oneTime: false,
        rewardTag: 'PACK',
        sortOrder: 2,
      },
      'item_repeat_create',
    );
    await addItem(
      {
        id: doomedId,
        title: 'E2E Doomed Unlock',
        subtitle: 'Deleted later',
        category: catId,
        priceCoins: 4,
        enabled: true,
        oneTime: true,
        rewardTag: 'GONE',
        sortOrder: 3,
      },
      'item_doomed_create',
    );
    await addItem(
      {
        id: offId,
        title: 'E2E Disabled',
        subtitle: 'Not for sale',
        category: catId,
        priceCoins: 5,
        enabled: false,
        oneTime: true,
        rewardTag: 'OFF',
        sortOrder: 4,
      },
      'item_disabled_create',
    );

    const buyer = await prisma.user.create({
      data: {
        googleSub: `e2e-shop-buyer-${stamp}`,
        email: buyerEmail,
        displayName: 'Shop Buyer E2E',
        coins: 500,
        tokenVersion: 0,
      },
    });
    const blank = await prisma.user.create({
      data: {
        googleSub: `e2e-shop-blank-${stamp}`,
        email: blankEmail,
        displayName: '',
        coins: 20,
        tokenVersion: 0,
      },
    });
    const poor = await prisma.user.create({
      data: {
        googleSub: `e2e-shop-poor-${stamp}`,
        email: poorEmail,
        displayName: 'Poor Buyer',
        coins: 1,
        tokenVersion: 0,
      },
    });
    userIds.push(buyer.id, blank.id, poor.id);

    const oldSeen = new Date(Date.now() - 86_400_000);
    const newSeen = new Date();
    await prisma.deviceInstall.create({
      data: {
        installId: `e2e-shop-old-${stamp}`,
        userId: buyer.id,
        model: 'OldPhone',
        brand: 'Samsung',
        lastSeenAt: oldSeen,
      },
    });
    await prisma.deviceInstall.create({
      data: {
        installId: `e2e-shop-new-${stamp}`,
        userId: buyer.id,
        model: 'Pixel 8',
        brand: 'Google',
        lastSeenAt: newSeen,
      },
    });

    const buyerTok = userJwt(buyer.id, buyer.email, 0);
    const blankTok = userJwt(blank.id, blank.email, 0);
    const poorTok = userJwt(poor.id, poor.email, 0);

    async function buy(
      token: string,
      itemId: string,
      requestId: string,
    ) {
      return req('POST', '/api/v1/economy/shop/purchase', {
        token,
        body: { itemId, requestId },
      });
    }

    const unlock = await buy(buyerTok, unlockId, `requnl${stamp}aaaa`);
    unlock.status === 201 || unlock.status === 200
      ? pass('buy_unlock', `coins=${unlock.json?.coins}`)
      : fail('buy_unlock', `status=${unlock.status} ${JSON.stringify(unlock.json)}`);
    unlock.json?.coins === 490 && unlock.json?.alreadyApplied === false
      ? pass('buy_unlock_balance')
      : fail('buy_unlock_balance', JSON.stringify(unlock.json));

    const unlockAgain = await buy(buyerTok, unlockId, `requnl${stamp}bbbb`);
    unlockAgain.status === 409
      ? pass('unlock_second_rejected')
      : fail('unlock_second_rejected', `status=${unlockAgain.status}`);

    const repA = await buy(buyerTok, repeatId, `reqrep${stamp}aaaa`);
    repA.status === 200 || repA.status === 201
      ? pass('buy_repeat_first', `coins=${repA.json?.coins}`)
      : fail('buy_repeat_first', `status=${repA.status} ${JSON.stringify(repA.json)}`);
    repA.json?.coins === 483
      ? pass('buy_repeat_first_balance')
      : fail('buy_repeat_first_balance', JSON.stringify(repA.json));

    const coinsBeforeRetry = (
      await prisma.user.findUnique({ where: { id: buyer.id }, select: { coins: true } })
    )?.coins;
    const repRetry = await buy(buyerTok, repeatId, `reqrep${stamp}aaaa`);
    const coinsAfterRetry = (
      await prisma.user.findUnique({ where: { id: buyer.id }, select: { coins: true } })
    )?.coins;
    (repRetry.status === 200 || repRetry.status === 201) &&
    repRetry.json?.alreadyApplied === true &&
    coinsBeforeRetry === coinsAfterRetry
      ? pass('repeat_same_request_no_double_charge')
      : fail(
          'repeat_same_request_no_double_charge',
          `status=${repRetry.status} before=${coinsBeforeRetry} after=${coinsAfterRetry}`,
        );

    const repB = await buy(buyerTok, repeatId, `reqrep${stamp}bbbb`);
    repB.json?.coins === 476
      ? pass('buy_repeat_second')
      : fail('buy_repeat_second', JSON.stringify(repB.json));

    const off = await buy(buyerTok, offId, `reqoff${stamp}aaaa`);
    off.status === 404
      ? pass('disabled_item_rejected')
      : fail('disabled_item_rejected', `status=${off.status}`);

    const poorBuy = await buy(poorTok, unlockId, `reqpoor${stamp}aaaa`);
    poorBuy.status === 409
      ? pass('poor_user_rejected')
      : fail('poor_user_rejected', `status=${poorBuy.status} ${JSON.stringify(poorBuy.json)}`);
    const poorLedger = await prisma.walletLedger.count({
      where: { userId: poor.id, reason: { startsWith: 'shop:' } },
    });
    poorLedger === 0
      ? pass('poor_user_no_ledger')
      : fail('poor_user_no_ledger', `rows=${poorLedger}`);

    const doomed = await buy(blankTok, doomedId, `reqdel${stamp}aaaa`);
    doomed.json?.coins === 16
      ? pass('blank_user_unlock')
      : fail('blank_user_unlock', JSON.stringify(doomed.json));

    await prisma.walletLedger.create({
      data: {
        userId: buyer.id,
        delta: 25,
        balanceAfter: 501,
        reason: 'staff:grant:e2e-shop',
        idempotencyKey: `e2e-shop-grant-${stamp}`,
      },
    });

    const listed = await req('GET', '/api/v1/admin/shop/purchases', { token: tok });
    const purchases: Purchase[] = Array.isArray(listed.json?.purchases)
      ? listed.json.purchases
      : [];
    listed.status === 200 && purchases.length > 0
      ? pass('admin_purchases_list', `count=${purchases.length}`)
      : fail('admin_purchases_list', `status=${listed.status}`);

    const dbShop = await prisma.walletLedger.findMany({
      where: { reason: { startsWith: 'shop:' } },
      select: {
        id: true,
        userId: true,
        delta: true,
        balanceAfter: true,
        reason: true,
        createdAt: true,
      },
    });
    const apiIds = new Set(purchases.map((row) => row.id));
    apiIds.size === purchases.length &&
    purchases.length === dbShop.length &&
    dbShop.every((row) => apiIds.has(row.id))
      ? pass('list_matches_every_shop_ledger', `db=${dbShop.length}`)
      : fail(
          'list_matches_every_shop_ledger',
          `api=${purchases.length} unique=${apiIds.size} db=${dbShop.length}`,
        );

    const grantInList = purchases.some((row) => row.id && row.itemId?.includes('staff'));
    const grantRow = await prisma.walletLedger.findFirst({
      where: { idempotencyKey: `e2e-shop-grant-${stamp}` },
    });
    grantRow && !purchases.some((row) => row.id === grantRow.id)
      ? pass('non_shop_ledger_hidden')
      : fail('non_shop_ledger_hidden', `grantInList=${grantInList}`);

    let sorted = true;
    for (let i = 1; i < purchases.length; i++) {
      if (purchases[i - 1].createdAt < purchases[i].createdAt) sorted = false;
    }
    sorted ? pass('newest_first') : fail('newest_first');

    const byLedger = new Map(dbShop.map((row) => [row.id, row]));
    let fieldsOk = true;
    let fieldDetail = '';
    for (const row of purchases) {
      const src = byLedger.get(row.id);
      if (!src) {
        fieldsOk = false;
        fieldDetail = `missing ledger ${row.id}`;
        break;
      }
      const itemId = src.reason.startsWith('shop:')
        ? src.reason.slice('shop:'.length)
        : src.reason;
      if (row.itemId !== itemId) {
        fieldsOk = false;
        fieldDetail = `itemId ${row.itemId} != ${itemId}`;
        break;
      }
      if (row.coins !== Math.abs(src.delta) || row.balanceAfter !== src.balanceAfter) {
        fieldsOk = false;
        fieldDetail = `money ${row.coins}/${row.balanceAfter}`;
        break;
      }
      if (new Date(row.createdAt).getTime() !== src.createdAt.getTime()) {
        fieldsOk = false;
        fieldDetail = `time ${row.createdAt}`;
        break;
      }
      if (!row.email || row.email.includes('***') || !row.email.includes('@')) {
        fieldsOk = false;
        fieldDetail = `email ${row.email}`;
        break;
      }
      if (!row.userId || !row.displayName) {
        fieldsOk = false;
        fieldDetail = 'missing user';
        break;
      }
    }
    fieldsOk ? pass('every_row_full_fields') : fail('every_row_full_fields', fieldDetail);

    function findBuy(userId: string, itemId: string, coins: number) {
      return purchases.filter(
        (row) => row.userId === userId && row.itemId === itemId && row.coins === coins,
      );
    }

    const unlockRows = findBuy(buyer.id, unlockId, 10);
    unlockRows.length === 1 &&
    unlockRows[0].email === buyerEmail &&
    unlockRows[0].displayName === 'Shop Buyer E2E' &&
    unlockRows[0].itemTitle === 'E2E Unlock Skin' &&
    unlockRows[0].category === catId &&
    unlockRows[0].oneTime === true &&
    unlockRows[0].balanceAfter === 490 &&
    unlockRows[0].deviceId === `e2e-shop-new-${stamp}` &&
    unlockRows[0].deviceLabel === 'Pixel 8 · Google'
      ? pass('unlock_row_full_identity')
      : fail('unlock_row_full_identity', JSON.stringify(unlockRows[0] ?? null));

    const repeatRows = findBuy(buyer.id, repeatId, 7);
    repeatRows.length === 2 &&
    repeatRows.every(
      (row) =>
        row.oneTime === false &&
        row.itemTitle === 'E2E Coin Pack' &&
        row.email === buyerEmail &&
        row.deviceLabel === 'Pixel 8 · Google',
    ) &&
    repeatRows.some((row) => row.balanceAfter === 483) &&
    repeatRows.some((row) => row.balanceAfter === 476)
      ? pass('repeat_rows_full_identity')
      : fail('repeat_rows_full_identity', `n=${repeatRows.length}`);

    const doomedRows = findBuy(blank.id, doomedId, 4);
    doomedRows.length === 1 &&
    doomedRows[0].email === blankEmail &&
    doomedRows[0].displayName === 'User' &&
    doomedRows[0].oneTime === true &&
    doomedRows[0].itemTitle === 'E2E Doomed Unlock' &&
    doomedRows[0].deviceId === '' &&
    doomedRows[0].deviceLabel === '' &&
    doomedRows[0].balanceAfter === 16
      ? pass('blank_name_and_no_device')
      : fail('blank_name_and_no_device', JSON.stringify(doomedRows[0] ?? null));

    const offRows = purchases.filter((row) => row.itemId === offId);
    offRows.length === 0
      ? pass('disabled_item_not_listed')
      : fail('disabled_item_not_listed', `n=${offRows.length}`);

    const catalog = await req('GET', '/api/v1/admin/shop', { token: tok });
    const adminItems: Array<{ id: string }> = catalog.json?.items ?? [];
    catalog.status === 200 &&
    adminItems.some((row) => row.id === unlockId) &&
    adminItems.some((row) => row.id === repeatId) &&
    adminItems.some((row) => row.id === offId)
      ? pass('admin_catalog_still_lists_items')
      : fail('admin_catalog_still_lists_items', `status=${catalog.status}`);

    const appCat = await req('GET', '/api/v1/economy/shop/catalog', {
      token: buyerTok,
    });
    const appItems: Array<{ id: string; stockSold?: number }> =
      appCat.json?.items ?? [];
    const unlockCat = appItems.find((row) => row.id === unlockId);
    const repeatCat = appItems.find((row) => row.id === repeatId);
    appCat.status === 200 &&
    unlockCat?.stockSold === 1 &&
    repeatCat?.stockSold === 2 &&
    !appItems.some((row) => row.id === offId)
      ? pass(
          'app_catalog_stock_counts',
          `unlock=${unlockCat?.stockSold} repeat=${repeatCat?.stockSold}`,
        )
      : fail(
          'app_catalog_stock_counts',
          `status=${appCat.status} unlock=${unlockCat?.stockSold} repeat=${repeatCat?.stockSold}`,
        );

    await prisma.deviceInstall.create({
      data: {
        installId: `e2e-shop-later-${stamp}`,
        userId: buyer.id,
        model: 'Future Phone',
        brand: 'Nokia',
        lastSeenAt: new Date(Date.now() + 60_000),
      },
    });
    const renamed = await req('PATCH', `/api/v1/admin/shop/${unlockId}`, {
      token: tok,
      body: { title: 'Renamed After Buy', oneTime: false },
    });
    renamed.status === 200
      ? pass('rename_after_buy')
      : fail('rename_after_buy', `status=${renamed.status}`);

    const frozen = await req('GET', '/api/v1/admin/shop/purchases', { token: tok });
    const frozenRows: Purchase[] = frozen.json?.purchases ?? [];
    const frozenUnlock = frozenRows.find(
      (row) => row.userId === buyer.id && row.itemId === unlockId,
    );
    frozen.status === 200 &&
    frozenUnlock?.itemTitle === 'E2E Unlock Skin' &&
    frozenUnlock.oneTime === true &&
    frozenUnlock.category === catId &&
    frozenUnlock.deviceId === `e2e-shop-new-${stamp}` &&
    frozenUnlock.deviceLabel === 'Pixel 8 · Google'
      ? pass('snapshot_survives_later_edits')
      : fail('snapshot_survives_later_edits', JSON.stringify(frozenUnlock ?? null));

    const removed = await req('DELETE', `/api/v1/admin/shop/${doomedId}`, { token: tok });
    removed.status === 200
      ? pass('delete_item')
      : fail('delete_item', `status=${removed.status}`);

    const after = await req('GET', '/api/v1/admin/shop/purchases', { token: tok });
    const afterRows: Purchase[] = after.json?.purchases ?? [];
    const gone = afterRows.find((row) => row.userId === blank.id && row.itemId === doomedId);
    after.status === 200 &&
    afterRows.length === purchases.length &&
    gone?.email === blankEmail &&
    gone.displayName === 'User' &&
    gone.itemTitle === 'E2E Doomed Unlock' &&
    gone.category === catId &&
    gone.oneTime === true &&
    gone.deviceId === '' &&
    gone.deviceLabel === '' &&
    gone.coins === 4
      ? pass('deleted_item_keeps_saved_details')
      : fail('deleted_item_keeps_saved_details', JSON.stringify(gone ?? null));

    const noHash = await bcrypt.hash('NoShopPass9', 12);
    await prisma.admin.upsert({
      where: { email: 'e2e.shop.denied@example.com' },
      update: {
        passwordHash: noHash,
        role: 'VIEWER',
        allowedModules: ['devices'],
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: 'e2e.shop.denied@example.com',
        passwordHash: noHash,
        role: 'VIEWER',
        allowedModules: ['devices'],
        isActive: true,
        mustChangePassword: false,
      },
    });
    const deniedLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: 'e2e.shop.denied@example.com', password: 'NoShopPass9' },
    });
    const dTok = bearer(deniedLogin);
    if (dTok) {
      const denied = await req('GET', '/api/v1/admin/shop/purchases', { token: dTok });
      denied.status === 403
        ? pass('shop_module_required')
        : fail('shop_module_required', `status=${denied.status}`);
    } else {
      fail('shop_module_required', 'denied login failed');
    }

    const vHash = await bcrypt.hash('ShopViewer9', 12);
    await prisma.admin.upsert({
      where: { email: 'e2e.shop.viewer@example.com' },
      update: {
        passwordHash: vHash,
        role: 'VIEWER',
        allowedModules: ['shop'],
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: 'e2e.shop.viewer@example.com',
        passwordHash: vHash,
        role: 'VIEWER',
        allowedModules: ['shop'],
        isActive: true,
        mustChangePassword: false,
      },
    });
    const viewerLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: 'e2e.shop.viewer@example.com', password: 'ShopViewer9' },
    });
    const vTok = bearer(viewerLogin);
    if (vTok) {
      const view = await req('GET', '/api/v1/admin/shop/purchases', { token: vTok });
      const viewRows: Purchase[] = view.json?.purchases ?? [];
      view.status === 200 && viewRows.length === afterRows.length
        ? pass('viewer_can_read_purchases', `count=${viewRows.length}`)
        : fail('viewer_can_read_purchases', `status=${view.status}`);
      const mutate = await req('POST', '/api/v1/admin/shop', {
        token: vTok,
        body: {
          id: `e2eview${stamp}`,
          title: 'Viewer Item',
          subtitle: 'Should fail',
          category: catId,
          priceCoins: 1,
          enabled: true,
          oneTime: true,
          rewardTag: 'NO',
        },
      });
      mutate.status === 403
        ? pass('viewer_cannot_edit_catalog')
        : fail('viewer_cannot_edit_catalog', `status=${mutate.status}`);
    } else {
      fail('viewer_can_read_purchases', 'viewer login failed');
    }
  } finally {
    if (userIds.length) {
      await prisma.walletLedger.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.deviceInstall.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.shopItem.deleteMany({ where: { id: { in: itemIds } } });
    await prisma.shopCategoryDef.deleteMany({ where: { id: catId } });
    await prisma.admin.deleteMany({
      where: {
        email: { in: ['e2e.shop.denied@example.com', 'e2e.shop.viewer@example.com'] },
      },
    });
  }

  printSummary();
  const failed = checks.filter((c) => !c.ok).length;
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  const ok = checks.filter((c) => c.ok).length;
  console.log(`\n${ok}/${checks.length} passed`);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
