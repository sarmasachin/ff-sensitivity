/**
 * Extra checks for shop purchase snapshots: saved copy in Postgres,
 * later edits to the same phone, legacy rows, and the backfill SQL.
 */
import { PrismaClient } from '@prisma/client';
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

function userJwt(userId: string, email: string) {
  return jwt.sign(
    { sub: userId, email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
}

type Purchase = {
  id: string;
  userId: string;
  email: string;
  googleName: string;
  displayName: string;
  deviceId: string;
  deviceLabel: string;
  itemId: string;
  itemTitle: string;
  category: string;
  oneTime: boolean;
  coins: number;
  balanceAfter: number;
  shopSnapshot?: unknown;
};

async function main() {
  loadEnv();
  const stamp = Date.now().toString(36);
  const catId = `E2S${stamp.toUpperCase()}`.slice(0, 32);
  const boostCat = `E2B${stamp.toUpperCase()}`.slice(0, 32);
  const modelId = `e2emod${stamp}`;
  const lateId = `e2elate${stamp}`;
  const liveId = `e2elive${stamp}`;
  const badId = `e2ebad${stamp}`;
  const boostId = `e2ebst${stamp}`;
  const userIds: string[] = [];
  const itemIds = [modelId, lateId, liveId, badId, boostId];
  const beforeShop = await prisma.walletLedger.count({
    where: { reason: { startsWith: 'shop:' } },
  });
  let crashed = false;

  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';

  try {
    const login = await req('POST', '/api/v1/auth/login', {
      body: { email: adminEmail, password: adminPassword },
    });
    const tok = bearer(login);
    if (!okAuth(login.status) || !tok) {
      fail('admin_login', `status=${login.status}`);
      return;
    }
    pass('admin_login');

    for (const [id, label, isBoost] of [
      [catId, 'E2E Snap', false],
      [boostCat, 'E2E Boost', true],
    ] as const) {
      const cat = await req('POST', '/api/v1/admin/shop/categories', {
        token: tok,
        body: { id, label, enabled: true, isBoost },
      });
      okAuth(cat.status)
        ? pass(`category_${id.slice(0, 3).toLowerCase()}`)
        : fail(`category_${id.slice(0, 3).toLowerCase()}`, JSON.stringify(cat.json));
    }

    async function addItem(
      id: string,
      title: string,
      category: string,
      oneTime: boolean,
      name: string,
    ) {
      const r = await req('POST', '/api/v1/admin/shop', {
        token: tok,
        body: {
          id,
          title,
          subtitle: 'Snapshot extra',
          category,
          priceCoins: 2,
          enabled: true,
          oneTime,
          rewardTag: 'E2E',
          sortOrder: 1,
        },
      });
      okAuth(r.status) ? pass(name) : fail(name, JSON.stringify(r.json));
    }

    await addItem(modelId, 'Model Only Skin', catId, true, 'item_model');
    await addItem(lateId, 'Late Device Skin', catId, true, 'item_late');
    await addItem(liveId, 'Live Fallback Skin', catId, true, 'item_live');
    await addItem(badId, 'Bad Snapshot Skin', catId, false, 'item_bad');
    await addItem(boostId, 'Boost Charge', boostCat, false, 'item_boost');

    const modelUser = await prisma.user.create({
      data: {
        googleSub: `e2e-snap-model-${stamp}`,
        email: `e2e.snap.model.${stamp}@example.com`,
        displayName: 'Model Buyer',
        coins: 50,
      },
    });
    const lateUser = await prisma.user.create({
      data: {
        googleSub: `e2e-snap-late-${stamp}`,
        email: `e2e.snap.late.${stamp}@example.com`,
        displayName: 'Late Buyer',
        coins: 50,
      },
    });
    const liveUser = await prisma.user.create({
      data: {
        googleSub: `e2e-snap-live-${stamp}`,
        email: `e2e.snap.live.${stamp}@example.com`,
        displayName: 'Live Buyer',
        coins: 40,
      },
    });
    const badUser = await prisma.user.create({
      data: {
        googleSub: `e2e-snap-bad-${stamp}`,
        email: `e2e.snap.bad.${stamp}@example.com`,
        displayName: 'Bad Buyer',
        coins: 30,
      },
    });
    userIds.push(modelUser.id, lateUser.id, liveUser.id, badUser.id);

    const modelInstall = await prisma.deviceInstall.create({
      data: {
        installId: `e2e-snap-model-${stamp}`,
        userId: modelUser.id,
        model: 'OnlyModel',
        brand: '',
        lastSeenAt: new Date(),
      },
    });
    await prisma.deviceInstall.create({
      data: {
        installId: `e2e-snap-live-${stamp}`,
        userId: liveUser.id,
        model: 'Legacy Phone',
        brand: 'Sony',
        lastSeenAt: new Date(),
      },
    });

    async function buy(userId: string, email: string, itemId: string, requestId: string) {
      return req('POST', '/api/v1/economy/shop/purchase', {
        token: userJwt(userId, email),
        body: { itemId, requestId },
      });
    }

    const modelBuy = await buy(modelUser.id, modelUser.email, modelId, `reqmod${stamp}aaaa`);
    modelBuy.json?.coins === 48
      ? pass('buy_model_only_device')
      : fail('buy_model_only_device', JSON.stringify(modelBuy.json));

    const saved = await prisma.walletLedger.findFirst({
      where: { userId: modelUser.id, reason: `shop:${modelId}` },
    });
    const snap = saved?.shopSnapshot as {
      oneTime?: boolean;
      title?: string;
      category?: string;
      deviceId?: string;
      deviceLabel?: string;
    } | null;
    snap?.oneTime === true &&
    snap.title === 'Model Only Skin' &&
    snap.category === catId &&
    snap.deviceId === `e2e-snap-model-${stamp}` &&
    snap.deviceLabel === 'OnlyModel'
      ? pass('db_snapshot_saved', JSON.stringify(snap))
      : fail('db_snapshot_saved', JSON.stringify(saved?.shopSnapshot ?? null));

    const retry = await buy(modelUser.id, modelUser.email, modelId, `reqmod${stamp}bbbb`);
    const afterRetry = await prisma.walletLedger.findFirst({
      where: { userId: modelUser.id, reason: `shop:${modelId}` },
    });
    retry.status === 409 &&
    JSON.stringify(afterRetry?.shopSnapshot) === JSON.stringify(saved?.shopSnapshot)
      ? pass('unlock_retry_keeps_snapshot')
      : fail(
          'unlock_retry_keeps_snapshot',
          `status=${retry.status} snap=${JSON.stringify(afterRetry?.shopSnapshot)}`,
        );

    const repeatId = `e2erep${stamp}`;
    itemIds.push(repeatId);
    await addItem(repeatId, 'Repeat Snap', catId, false, 'item_repeat_snap');
    const rep = await buy(modelUser.id, modelUser.email, repeatId, `reqrep${stamp}aaaa`);
    const repSaved = await prisma.walletLedger.findFirst({
      where: {
        userId: modelUser.id,
        reason: `shop:${repeatId}`,
        idempotencyKey: `shop:${modelUser.id}:${repeatId}:req:reqrep${stamp}aaaa`,
      },
    });
    const repRetry = await buy(modelUser.id, modelUser.email, repeatId, `reqrep${stamp}aaaa`);
    const repAfter = await prisma.walletLedger.findFirst({
      where: { idempotencyKey: `shop:${modelUser.id}:${repeatId}:req:reqrep${stamp}aaaa` },
    });
    const repCount = await prisma.walletLedger.count({
      where: { userId: modelUser.id, reason: `shop:${repeatId}` },
    });
    rep.json?.coins === 46 &&
    repRetry.json?.alreadyApplied === true &&
    repCount === 1 &&
    JSON.stringify(repAfter?.shopSnapshot) === JSON.stringify(repSaved?.shopSnapshot) &&
    (repSaved?.shopSnapshot as { title?: string } | null)?.title === 'Repeat Snap'
      ? pass('repeat_retry_keeps_snapshot')
      : fail(
          'repeat_retry_keeps_snapshot',
          `buy=${JSON.stringify(rep.json)} retry=${JSON.stringify(repRetry.json)} n=${repCount}`,
        );

    await prisma.deviceInstall.update({
      where: { id: modelInstall.id },
      data: { model: 'Renamed Model', brand: 'LaterBrand', lastSeenAt: new Date() },
    });

    const lateBuy = await buy(lateUser.id, lateUser.email, lateId, `reqlate${stamp}aaaa`);
    lateBuy.json?.coins === 48
      ? pass('buy_without_device')
      : fail('buy_without_device', JSON.stringify(lateBuy.json));
    await prisma.deviceInstall.create({
      data: {
        installId: `e2e-snap-after-${stamp}`,
        userId: lateUser.id,
        model: 'Phone Added Later',
        brand: 'Oppo',
        lastSeenAt: new Date(),
      },
    });

    await prisma.walletLedger.create({
      data: {
        userId: liveUser.id,
        delta: -2,
        balanceAfter: 38,
        reason: `shop:${liveId}`,
        idempotencyKey: `e2e-snap-live-${stamp}`,
      },
    });
    await prisma.walletLedger.create({
      data: {
        userId: badUser.id,
        delta: -2,
        balanceAfter: 28,
        reason: `shop:${badId}`,
        idempotencyKey: `e2e-snap-bad-${stamp}`,
        shopSnapshot: { foo: 1 },
      },
    });

    async function list(): Promise<Purchase[]> {
      const r = await req('GET', '/api/v1/admin/shop/purchases', { token: tok });
      if (r.status !== 200 || !Array.isArray(r.json?.purchases)) {
        fail('list_ok', `status=${r.status}`);
        return [];
      }
      return r.json.purchases as Purchase[];
    }

    const beforeFreeze = await list();
    const liveRow = beforeFreeze.find((row) => row.userId === liveUser.id && row.itemId === liveId);
    const badRow = beforeFreeze.find((row) => row.userId === badUser.id && row.itemId === badId);
    liveRow?.itemTitle === 'Live Fallback Skin' &&
    liveRow.oneTime === true &&
    liveRow.deviceLabel === 'Legacy Phone · Sony' &&
    liveRow.email === liveUser.email &&
    badRow?.itemTitle === 'Bad Snapshot Skin' &&
    badRow.oneTime === false &&
    badRow.deviceId === '' &&
    !('shopSnapshot' in (badRow ?? {}))
      ? pass('legacy_and_bad_snapshot_fall_back')
      : fail(
          'legacy_and_bad_snapshot_fall_back',
          `live=${JSON.stringify(liveRow)} bad=${JSON.stringify(badRow)}`,
        );

    const legacyDb = await prisma.walletLedger.findFirst({
      where: { idempotencyKey: `e2e-snap-live-${stamp}` },
    });
    if (!legacyDb) {
      fail('backfill_row');
    } else {
      const updated = await prisma.$executeRaw`
        UPDATE "wallet_ledger" AS wl
        SET "shop_snapshot" = jsonb_build_object(
          'oneTime', si.one_time,
          'title', si.title,
          'category', si.category,
          'deviceId', COALESCE((
            SELECT di.install_id
            FROM "device_installs" AS di
            WHERE di.user_id = wl.user_id
            ORDER BY di.last_seen_at DESC
            LIMIT 1
          ), ''),
          'deviceLabel', COALESCE((
            SELECT NULLIF(
              concat_ws(' · ', NULLIF(di.model, ''), NULLIF(di.brand, '')),
              ''
            )
            FROM "device_installs" AS di
            WHERE di.user_id = wl.user_id
            ORDER BY di.last_seen_at DESC
            LIMIT 1
          ), '')
        )
        FROM "shop_items" AS si
        WHERE wl.shop_snapshot IS NULL
          AND wl.reason = 'shop:' || si.id
          AND wl.id = ${legacyDb.id}
      `;
      updated === 1 ? pass('backfill_sql') : fail('backfill_sql', `updated=${updated}`);
    }

    await prisma.shopItem.update({
      where: { id: liveId },
      data: { title: 'Changed Live Title', oneTime: false },
    });
    await prisma.deviceInstall.updateMany({
      where: { userId: liveUser.id },
      data: { model: 'New Sony', brand: 'Changed' },
    });
    await prisma.shopItem.update({
      where: { id: modelId },
      data: { title: 'Changed Model Title', oneTime: false },
    });
    await prisma.user.update({
      where: { id: modelUser.id },
      data: { googleName: 'Sachin Google', displayName: 'Model Buyer' },
    });

    const frozen = await list();
    const modelRow = frozen.find((row) => row.userId === modelUser.id && row.itemId === modelId);
    const lateRow = frozen.find((row) => row.userId === lateUser.id && row.itemId === lateId);
    const filled = frozen.find((row) => row.userId === liveUser.id && row.itemId === liveId);
    modelRow?.itemTitle === 'Model Only Skin' &&
    modelRow.googleName === 'Sachin Google' &&
    modelRow.displayName === 'Model Buyer' &&
    modelRow.oneTime === true &&
    modelRow.deviceLabel === 'OnlyModel' &&
    modelRow.deviceId === `e2e-snap-model-${stamp}` &&
    lateRow?.deviceId === '' &&
    lateRow.deviceLabel === '' &&
    lateRow.itemTitle === 'Late Device Skin' &&
    lateRow.oneTime === true &&
    filled?.itemTitle === 'Live Fallback Skin' &&
    filled.oneTime === true &&
    filled.deviceLabel === 'Legacy Phone · Sony' &&
    filled.category === catId
      ? pass('saved_copy_ignores_later_device_and_catalog')
      : fail(
          'saved_copy_ignores_later_device_and_catalog',
          `model=${JSON.stringify(modelRow)} late=${JSON.stringify(lateRow)} filled=${JSON.stringify(filled)}`,
        );

    const boostBuy = await buy(badUser.id, badUser.email, boostId, `reqbst${stamp}aaaa`);
    const charge = await prisma.userBoostCharge.findUnique({
      where: { userId_boostId: { userId: badUser.id, boostId } },
    });
    const boostSnap = await prisma.walletLedger.findFirst({
      where: { userId: badUser.id, reason: `shop:${boostId}` },
    });
    const boostJson = boostSnap?.shopSnapshot as { title?: string; oneTime?: boolean } | null;
    boostBuy.json?.coins === 28 &&
    charge?.charges === 1 &&
    boostJson?.title === 'Boost Charge' &&
    boostJson.oneTime === false
      ? pass('boost_purchase_saves_snapshot')
      : fail(
          'boost_purchase_saves_snapshot',
          `buy=${JSON.stringify(boostBuy.json)} charge=${charge?.charges} snap=${JSON.stringify(boostJson)}`,
        );

    const goneId = `e2egone${stamp}`;
    itemIds.push(goneId);
    await addItem(goneId, 'Boost Probe', catId, true, 'item_audit_title');
    await prisma.walletLedger.create({
      data: {
        userId: liveUser.id,
        delta: -2,
        balanceAfter: 36,
        reason: `shop:${goneId}`,
        idempotencyKey: `e2e-snap-gone-${stamp}`,
      },
    });
    const removed = await req('DELETE', `/api/v1/admin/shop/${goneId}`, { token: tok });
    const afterDelete = await list();
    const goneRow = afterDelete.find(
      (row) => row.userId === liveUser.id && row.itemId === goneId,
    );
    removed.status === 200 && goneRow?.itemTitle === 'Boost Probe'
      ? pass('deleted_item_title_from_audit')
      : fail('deleted_item_title_from_audit', JSON.stringify(goneRow ?? null));

    const grant = await prisma.walletLedger.create({
      data: {
        userId: modelUser.id,
        delta: 1,
        balanceAfter: 49,
        reason: 'staff:grant:e2e-snap-extra',
        idempotencyKey: `e2e-snap-grant-${stamp}`,
      },
    });
    grant.shopSnapshot == null
      ? pass('non_shop_snapshot_empty')
      : fail('non_shop_snapshot_empty');

    const endShop = await prisma.walletLedger.count({
      where: { reason: { startsWith: 'shop:' } },
    });
    endShop === beforeShop + 7
      ? pass('shop_rows_added', `before=${beforeShop} after=${endShop}`)
      : fail('shop_rows_added', `before=${beforeShop} after=${endShop}`);
  } catch (err) {
    crashed = true;
    console.error(err);
  } finally {
    if (userIds.length) {
      await prisma.walletLedger.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.deviceInstall.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userBoostCharge.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.shopItem.deleteMany({ where: { id: { in: itemIds } } });
    await prisma.shopCategoryDef.deleteMany({ where: { id: { in: [catId, boostCat] } } });
    const after = await prisma.walletLedger.count({
      where: { reason: { startsWith: 'shop:' } },
    });
    after === beforeShop
      ? pass('cleanup_restored_shop_rows', `count=${after}`)
      : fail('cleanup_restored_shop_rows', `before=${beforeShop} after=${after}`);
    const ok = checks.filter((c) => c.ok).length;
    console.log(`\n${ok}/${checks.length} passed`);
    await prisma.$disconnect();
    process.exit(crashed || checks.some((c) => !c.ok) ? 1 : 0);
  }
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
